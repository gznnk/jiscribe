import {
	calcEuclideanDistance,
	calcFrameKeyPoints,
	isTransformedFrame,
	roundToDecimal,
	type Point,
} from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import {
	isConnectPointId,
	isSameEndpoint,
	type CenterAnchorSpec,
	type ConnectPointAnchorSpec,
	type ConnectPointId,
	type EndpointRef,
} from "../../../../../schemas/objects/types/EndpointRef";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import { objectMapperRegistry } from "../../../../../states/registry/ObjectMapperRegistry";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import type { ControlStrategy } from "../ControlEventHandler";

/**
 * Connection anchor からのドラッグでコネクターを作成するハンドラー。
 * ControlEventHandler に ControlStrategy として登録する。
 *
 * Control ID フォーマット: "connection-anchor:<objectId>:<anchorPosition>"
 * 例: "connection-anchor:rect-1:topCenter"
 */
export class ConnectionAnchorEventHandler implements ControlStrategy {
	readonly controlType = "connection-anchor";

	supports(event: CanvasEvent): boolean {
		if (event.targetKind !== "control") {
			return false;
		}

		const targetId = event.targetId;
		if (!targetId) {
			return false;
		}

		// connection-anchor で始まるコントロールをサポート（create/edit 両方）
		return targetId.startsWith("connection-anchor:");
	}

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		// Only handle left-click (button 0)
		if (event.button !== 0) {
			return state;
		}

		const targetControlId = event.targetId;
		if (!targetControlId) {
			return state;
		}

		// Control ID をパース: "connection-anchor:<mode>:..."
		const parts = targetControlId.split(":");
		if (parts.length < 2 || parts[0] !== "connection-anchor") {
			return state;
		}

		const mode = parts[1]; // "create" or "edit"

		// ジェスチャータイプに応じて処理
		if (event.type === "dragStart") {
			return mode === "edit"
				? this.handleEditDragStart(state, event, parts)
				: this.handleCreateDragStart(state, event, parts);
		} else if (event.type === "drag") {
			return this.handleDrag(state, event); // 新規・編集共通
		} else if (event.type === "dragEnd") {
			return this.handleDragEnd(state, event); // 新規・編集共通
		}

		return state;
	}

	/**
	 * Connection anchor でのドラッグ開始を処理する（新規作成モード）。
	 * 新しいコネクターの作成を開始する。
	 */
	private handleCreateDragStart(
		state: CanvasControllerState,
		event: CanvasEvent,
		parts: string[],
	): CanvasControllerState {
		// parts = ["connection-anchor", "create", sourceObjectId, anchorPosition]
		if (parts.length !== 4) {
			return state;
		}

		const [, , sourceObjectId, anchorPosition] = parts;
		const sourceObject = state.objects[sourceObjectId];

		if (!sourceObject) {
			return state;
		}

		// Validate anchor position
		if (!isConnectPointId(anchorPosition)) {
			return state;
		}

		// Generate unique ID for the new connector
		const connectorId = crypto.randomUUID();

		// Create a temporary connector with source anchor and free target
		const pendingConnector: ConnectorState = {
			id: connectorId,
			type: "connector",
			// points は中間経由点のみ（端点は source/target が持つ）。新規作成時は直線なので空
			points: [] as Point[],
			source: {
				owner: { type: sourceObject.type, id: sourceObjectId },
				anchor:
					anchorPosition === "center"
						? { kind: "center" }
						: { kind: "connectPoint", id: anchorPosition },
			},
			target: {
				anchor: { kind: "free", point: { x: event.last.x, y: event.last.y } },
			},
			stroke: "#6b7280",
			strokeWidth: 2,
			endArrow: "ConcaveTriangle",
		} as ConnectorState;

		return {
			...state,
			pendingConnector,
			editingEndpoint: "target", // 新規作成時は常に target を編集
			edgeScrollEnabled: true,
			// Clear any selection to avoid confusion
			selectedIds: [],
			multiSelectGroup: null,
			objectMenuOpenId: null,
		};
	}

	/**
	 * エンドポイント編集のドラッグ開始処理。
	 * polyline の頂点編集と同様に、pendingConnector（overlay）は使わず実体を直接編集する。
	 * そのため objects / connectorIds は変更せず（重なり順を維持）、選択状態も保持して
	 * ConnectorControls の端点ハンドルが実体に追従するようにする。
	 * 実際の端点更新は handleDrag が eventStartSnapshot を基点に行う。
	 */
	private handleEditDragStart(
		state: CanvasControllerState,
		_event: CanvasEvent,
		parts: string[],
	): CanvasControllerState {
		// parts = ["connection-anchor", "edit", connectorId, endpoint]
		if (parts.length !== 4) {
			return state;
		}

		const [, , connectorId, endpointStr] = parts;
		const endpoint = endpointStr as "source" | "target";

		if (endpoint !== "source" && endpoint !== "target") {
			return state;
		}

		const connector = state.objects[connectorId];
		if (!connector || connector.type !== "connector") {
			return state;
		}

		return {
			...state,
			editingConnectorId: connectorId,
			editingEndpoint: endpoint,
			edgeScrollEnabled: true,
			objectMenuOpenId: null,
		};
	}

	/**
	 * targetId から編集中のエンドポイントを取得する。
	 * "connection-anchor:edit:...:source" -> "source"
	 * "connection-anchor:edit:...:target" -> "target"
	 * "connection-anchor:create:..." -> "target" (デフォルト)
	 */
	private getEditingEndpoint(
		targetId: string | undefined,
	): "source" | "target" {
		if (!targetId) {
			return "target";
		}

		const parts = targetId.split(":");
		// Format: "connection-anchor:edit:connectorId:endpoint"
		if (parts.length === 4 && parts[1] === "edit") {
			const endpoint = parts[3];
			if (endpoint === "source" || endpoint === "target") {
				return endpoint;
			}
		}

		// Default to "target" for creation mode
		return "target";
	}

	/**
	 * baseConnector の編集対象エンドポイントを、現在のカーソル位置・hover 状況に応じて
	 * 更新した新しい ConnectorState を返す。
	 * hover 中の接続可能オブジェクトがあれば最近接アンカーへ接続（OwnedEndpointRef）、
	 * なければカーソル位置の FreeAnchor とする。固定側・points はそのまま保持する。
	 */
	private computeEditedEndpoint(
		state: CanvasControllerState,
		event: CanvasEvent,
		baseConnector: ConnectorState,
		endpointToUpdate: "source" | "target",
	): ConnectorState {
		// Create a free endpoint at the current cursor position
		const freeEndpoint: EndpointRef = {
			anchor: {
				kind: "free",
				point: {
					x: roundToDecimal(event.last.x, PRECISION.COORDINATE),
					y: roundToDecimal(event.last.y, PRECISION.COORDINATE),
				},
			},
		};

		// Get the fixed endpoint's object ID to exclude it from hover detection
		const fixedEndpoint =
			endpointToUpdate === "source"
				? baseConnector.target
				: baseConnector.source;
		const fixedObjectId = fixedEndpoint.owner?.id;

		// Find the first valid hover target:
		// - Exclude the fixed endpoint's object (can't connect to self)
		// - Only include objects with connectable feature enabled
		const hoveredObjectId = event.hovered
			.map((h) => h.id)
			.find((id: string) => {
				if (id === fixedObjectId) {
					return false;
				}

				const obj = state.objects[id];
				if (!obj) {
					return false;
				}

				return objectMapperRegistry.getFeatures(obj.type)?.connectable === true;
			});
		const hoveredObject = hoveredObjectId
			? state.objects[hoveredObjectId]
			: null;

		// If hovering over a valid target, connect as OwnedEndpointRef.
		// Use the nearest connect-point (topCenter/rightCenter/bottomCenter/leftCenter)
		// or center, whichever is closest to the current cursor position.
		const editedEndpoint: EndpointRef = hoveredObject
			? {
					owner: { type: hoveredObject.type, id: hoveredObjectId! },
					anchor: this.calcNearestAnchor(
						hoveredObject,
						event.last.x,
						event.last.y,
					),
				}
			: freeEndpoint;

		return {
			...baseConnector,
			source:
				endpointToUpdate === "source" ? editedEndpoint : baseConnector.source,
			target:
				endpointToUpdate === "target" ? editedEndpoint : baseConnector.target,
		} as ConnectorState;
	}

	/**
	 * Connection anchor からのドラッグ中の処理。
	 * 編集モードでは実体（objects）を直接更新し、新規作成モードでは pendingConnector を更新する。
	 */
	private handleDrag(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		// Determine which endpoint is being edited from targetId
		// Format: "connection-anchor:create:..." or "connection-anchor:edit:...:source|target"
		const endpointToUpdate = this.getEditingEndpoint(event.targetId);
		const { editingConnectorId } = state;

		// 編集モード: polyline 頂点編集と同様に実体を直接書き換える（overlay を使わない）。
		// 基点は eventStartSnapshot の原本コネクターなので、固定側・中間点は常に開始時の値を保つ。
		if (editingConnectorId) {
			const baseConnector =
				state.eventStartSnapshot?.objects[editingConnectorId];
			if (!baseConnector || baseConnector.type !== "connector") {
				return state;
			}

			const updated = this.computeEditedEndpoint(
				state,
				event,
				baseConnector as ConnectorState,
				endpointToUpdate,
			);

			return {
				...state,
				objects: {
					...state.objects,
					[editingConnectorId]: { ...updated, id: editingConnectorId },
				},
			};
		}

		// 新規作成モード: pendingConnector を更新（実体はまだ存在しない）。
		const { pendingConnector } = state;
		if (!pendingConnector) {
			return state;
		}

		const updated = this.computeEditedEndpoint(
			state,
			event,
			pendingConnector,
			endpointToUpdate,
		);

		return {
			...state,
			pendingConnector: updated,
		};
	}

	/**
	 * Connection anchor でのドラッグ終了を処理する。
	 * hover 中のオブジェクトがあればコネクターを確定し、なければ FreeAnchor として確定。
	 */
	private handleDragEnd(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		const { editingConnectorId } = state;

		// 編集モード: 実体を直接編集済み。最終状態を適用してコミット判定する。
		if (editingConnectorId) {
			const original = state.eventStartSnapshot?.objects[editingConnectorId];

			// 端点が開始時から実質変化していなければ no-op。
			// objects を据え置く（handleDrag 中に実体は最終位置＝開始位置になっている）ことで、
			// handleGesture の自動コミット判定（objects 参照の変化）を回避し履歴に積まれないようにする。
			const finalConnector = this.handleDrag(state, event).objects[
				editingConnectorId
			];
			const isNoOp =
				original?.type === "connector" &&
				finalConnector?.type === "connector" &&
				this.isSameConnectorEndpoints(
					original as ConnectorState,
					finalConnector as ConnectorState,
				);

			if (isNoOp) {
				return {
					...state,
					editingConnectorId: null,
					editingEndpoint: null,
					edgeScrollEnabled: false,
				};
			}

			// 端点が変化した場合は実体更新を確定（commitVersion は handleGesture が
			// objects の変化を検知して自動加算するため、ここでは増分しない）。
			const dragResult = this.handleDrag(state, event);
			return {
				...dragResult,
				editingConnectorId: null,
				editingEndpoint: null,
				edgeScrollEnabled: false,
			};
		}

		// 新規作成モード: pendingConnector を確定する。
		const { pendingConnector } = state;
		if (!pendingConnector) {
			return {
				...state,
				edgeScrollEnabled: false,
			};
		}

		const dragResult = this.handleDrag(state, event);
		const finalConnector = dragResult.pendingConnector;
		if (!finalConnector) {
			return {
				...dragResult,
				edgeScrollEnabled: false,
				editingEndpoint: null,
			};
		}

		return {
			...dragResult,
			objects: {
				...dragResult.objects,
				[finalConnector.id]: finalConnector,
			},
			connectorIds: [...dragResult.connectorIds, finalConnector.id],
			pendingConnector: null,
			editingEndpoint: null,
			edgeScrollEnabled: false,
			commitVersion: state.commitVersion + 1,
		};
	}

	/**
	 * 2 つのコネクターの端点（source / target）と中間経由点が同値かどうかを判定する。
	 * 「アンカーをつまんで元の位置に戻した」だけの no-op 編集を検出するために使う。
	 */
	private isSameConnectorEndpoints(
		srcConnector: ConnectorState,
		clonedConnector: ConnectorState,
	): boolean {
		if (!isSameEndpoint(srcConnector.source, clonedConnector.source)) {
			return false;
		}
		if (!isSameEndpoint(srcConnector.target, clonedConnector.target)) {
			return false;
		}

		const srcPoints = srcConnector.points;
		const clonedPoints = clonedConnector.points;
		if (srcPoints.length !== clonedPoints.length) {
			return false;
		}
		return srcPoints.every(
			(p, i) => p.x === clonedPoints[i].x && p.y === clonedPoints[i].y,
		);
	}

	/**
	 * カーソル位置に最も近いアンカーを返す。
	 * フレームを持つオブジェクトは 4 中点 + center から選択し、
	 * フレームを持たないオブジェクトは center を返す。
	 */
	private calcNearestAnchor(
		obj: { cx?: number; cy?: number; [key: string]: unknown },
		cursorX: number,
		cursorY: number,
	): CenterAnchorSpec | ConnectPointAnchorSpec {
		if (!isTransformedFrame(obj)) {
			return { kind: "center" };
		}

		const keyPoints = calcFrameKeyPoints(obj);

		const candidates: Array<{
			id: ConnectPointId | null;
			x: number;
			y: number;
		}> = [
			{ id: null, x: obj.cx, y: obj.cy },
			{ id: "topCenter", x: keyPoints.topCenter.x, y: keyPoints.topCenter.y },
			{
				id: "rightCenter",
				x: keyPoints.rightCenter.x,
				y: keyPoints.rightCenter.y,
			},
			{
				id: "bottomCenter",
				x: keyPoints.bottomCenter.x,
				y: keyPoints.bottomCenter.y,
			},
			{
				id: "leftCenter",
				x: keyPoints.leftCenter.x,
				y: keyPoints.leftCenter.y,
			},
		];

		let nearest = candidates[0];
		let minDist = calcEuclideanDistance(cursorX, cursorY, nearest.x, nearest.y);

		for (let i = 1; i < candidates.length; i++) {
			const c = candidates[i];
			const dist = calcEuclideanDistance(cursorX, cursorY, c.x, c.y);
			if (dist < minDist) {
				minDist = dist;
				nearest = c;
			}
		}

		return nearest.id === null
			? { kind: "center" }
			: { kind: "connectPoint", id: nearest.id };
	}
}
