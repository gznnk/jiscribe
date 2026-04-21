import {
	calcEuclideanDistance,
	calcFrameKeyPoints,
	isTransformedFrame,
	roundToDecimal,
} from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type { CanvasEvent } from "../../../../../registry/GestureHandlerRegistryTypes";
import {
	isConnectPointId,
	type CenterAnchorSpec,
	type ConnectPointAnchorSpec,
	type ConnectPointId,
	type EndpointRef,
} from "../../../../../schemas/objects/types/EndpointRef";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
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
		const connectorId = `connector-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

		// Create a temporary connector with source anchor and free target
		const pendingConnector: ConnectorState = {
			id: connectorId,
			type: "connector",
			points: [
				{ x: event.last.x, y: event.last.y },
				{ x: event.last.x, y: event.last.y },
			],
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
			stroke: "black",
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
	 * 選択中のコネクターをpendingConnectorに変換し、編集対象のエンドポイントをFreeAnchorに設定。
	 */
	private handleEditDragStart(
		state: CanvasControllerState,
		event: CanvasEvent,
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

		// 編集対象のエンドポイントをFreeAnchorに変換（カーソル位置追従準備）
		const freeEndpoint: EndpointRef = {
			anchor: {
				kind: "free",
				point: {
					x: roundToDecimal(event.last.x, PRECISION.COORDINATE),
					y: roundToDecimal(event.last.y, PRECISION.COORDINATE),
				},
			},
		};

		// pendingConnectorを作成（編集対象のエンドポイントをFreeに設定）
		const connectorTyped = connector as ConnectorState;
		const pendingConnector: ConnectorState = {
			...connectorTyped,
			source: endpoint === "source" ? freeEndpoint : connectorTyped.source,
			target: endpoint === "target" ? freeEndpoint : connectorTyped.target,
		};

		// 編集元のコネクターをobjectsから削除（非表示化）
		const { [connectorId]: _, ...remainingObjects } = state.objects;
		const updatedConnectorIds = state.connectorIds.filter(
			(id) => id !== connectorId,
		);

		return {
			...state,
			objects: remainingObjects,
			connectorIds: updatedConnectorIds,
			pendingConnector,
			editingConnectorId: connectorId,
			editingEndpoint: endpoint,
			selectedConnectorId: null, // 編集中は選択解除
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
	 * Connection anchor からのドラッグ中の処理。
	 * コネクターの終点を更新し、hover 判定を行う。
	 */
	private handleDrag(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		const { pendingConnector } = state;

		if (!pendingConnector) {
			return state;
		}

		// Determine which endpoint is being edited from targetId
		// Format: "connection-anchor:create:..." or "connection-anchor:edit:...:source|target"
		const endpointToUpdate = this.getEditingEndpoint(event.targetId);

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

		// Update the connector with the free endpoint on the correct side
		const updatedConnector: ConnectorState = {
			...pendingConnector,
			source:
				endpointToUpdate === "source" ? freeEndpoint : pendingConnector.source,
			target:
				endpointToUpdate === "target" ? freeEndpoint : pendingConnector.target,
		} as ConnectorState;

		// Get the fixed endpoint's object ID to exclude it from hover detection
		const fixedEndpoint =
			endpointToUpdate === "source"
				? pendingConnector.target
				: pendingConnector.source;
		const fixedObjectId = fixedEndpoint.owner?.id;

		// Find the first valid hover target:
		// - Exclude the fixed endpoint's object (can't connect to self)
		// - Exclude connectors (for now, only allow connecting to shapes)
		const hoveredObjectId = event.hovered
			.map((h) => h.id)
			.find((id: string) => {
				if (id === fixedObjectId) return false;
				const obj = state.objects[id];
				return obj && obj.type !== "connector";
			});
		const hoveredObject = hoveredObjectId
			? state.objects[hoveredObjectId]
			: null;

		// If hovering over a valid target, preview as connected (OwnedEndpointRef).
		// Use the nearest connect-point (topCenter/rightCenter/bottomCenter/leftCenter)
		// or center, whichever is closest to the current cursor position.
		const previewEndpoint: EndpointRef = hoveredObject
			? {
					owner: { type: hoveredObject.type, id: hoveredObjectId! },
					anchor: this.calcNearestAnchor(
						hoveredObject,
						event.last.x,
						event.last.y,
					),
				}
			: freeEndpoint;

		// Apply the preview endpoint to the correct side
		const finalConnector: ConnectorState = {
			...updatedConnector,
			source:
				endpointToUpdate === "source"
					? previewEndpoint
					: updatedConnector.source,
			target:
				endpointToUpdate === "target"
					? previewEndpoint
					: updatedConnector.target,
		};

		return {
			...state,
			pendingConnector: finalConnector,
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
		const { pendingConnector, editingConnectorId } = state;

		if (!pendingConnector) {
			return {
				...state,
				edgeScrollEnabled: false,
			};
		}

		// drag の最終状態を適用（handleDrag が既に正しい endpoint を更新済み）
		const dragResult = this.handleDrag(state, event);
		const finalConnector = dragResult.pendingConnector;
		if (!finalConnector) {
			return {
				...dragResult,
				edgeScrollEnabled: false,
				editingEndpoint: null,
			};
		}

		// 編集モードか新規作成モードかで処理を分岐
		if (editingConnectorId) {
			// 編集モード: 元のIDで上書き
			return {
				...dragResult,
				objects: {
					...dragResult.objects,
					[editingConnectorId]: { ...finalConnector, id: editingConnectorId },
				},
				connectorIds: [...dragResult.connectorIds, editingConnectorId],
				pendingConnector: null,
				editingConnectorId: null,
				editingEndpoint: null,
				selectedConnectorId: editingConnectorId, // 選択を復元
				edgeScrollEnabled: false,
				lastCommitTime: event.time,
			};
		} else {
			// 新規作成モード（既存ロジック）
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
				lastCommitTime: event.time,
			};
		}
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
