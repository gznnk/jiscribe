import type { Point } from "@workspace/geometry";

import { isConnectPointId } from "../../../../../schemas/objects/types/EndpointRef";
import { AUTO_COLOR } from "../../../../../schemas/objects/utils/autoColor";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import { objectMapperRegistry } from "../../../../../states/registry/ObjectMapperRegistry";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import type { ControlStrategy } from "../ControlEventHandler";
import { computeEditedEndpoint } from "./utils/computeEditedEndpoint";
import { findConnectableHoverTarget } from "./utils/findConnectableHoverTarget";
import { getEditingEndpoint } from "./utils/getEditingEndpoint";
import { isSameConnectorEndpoints } from "./utils/isSameConnectorEndpoints";

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
			// routing は省略する。省略時は orthogonal（自動直交ルーティング）が既定。
			// 直線にしたい場合のみ "straight" を明示する。
			stroke: AUTO_COLOR,
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
	 * そのため objects / rootIds は変更せず（重なり順を維持）、選択状態も保持して
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
	 * baseConnector の編集対象エンドポイントを、現在のカーソル位置・hover 状況に応じて
	 * 更新した新しい ConnectorState を返す。
	 * hover 対象の解決（state.objects / registry 依存）だけをここで行い、
	 * 端点の組み立ては純粋関数 computeEditedEndpoint に委譲する。
	 */
	private buildEditedConnector(
		state: CanvasControllerState,
		event: CanvasEvent,
		baseConnector: ConnectorState,
		endpointToUpdate: "source" | "target",
	): ConnectorState {
		// Exclude the fixed endpoint's object from hover detection (can't connect to self)
		const fixedEndpoint =
			endpointToUpdate === "source"
				? baseConnector.target
				: baseConnector.source;

		const hoveredTarget = findConnectableHoverTarget({
			hovered: event.hovered,
			objects: state.objects,
			fixedObjectId: fixedEndpoint.owner?.id,
			isConnectable: (type) =>
				objectMapperRegistry.getFeatures(type)?.connectable === true,
		});

		return computeEditedEndpoint(
			baseConnector,
			endpointToUpdate,
			event.last,
			hoveredTarget,
		);
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
		const endpointToUpdate = getEditingEndpoint(event.targetId);
		const { editingConnectorId } = state;

		// 編集モード: polyline 頂点編集と同様に実体を直接書き換える（overlay を使わない）。
		// 基点は eventStartSnapshot の原本コネクターなので、固定側・中間点は常に開始時の値を保つ。
		if (editingConnectorId) {
			const baseConnector =
				state.eventStartSnapshot?.objects[editingConnectorId];
			if (!baseConnector || baseConnector.type !== "connector") {
				return state;
			}

			const updated = this.buildEditedConnector(
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

		const updated = this.buildEditedConnector(
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

			// 不変条件ガード: 編集確定で両端 free になる場合は編集を破棄し元に戻す。
			// UI 側（ConnectorControls）で owned 端ハンドルを隠しているため通常は到達しないが、
			// connector が常に「少なくとも一方 owned」であることを防御的に担保する。
			if (
				finalConnector?.type === "connector" &&
				!(finalConnector as ConnectorState).source.owner &&
				!(finalConnector as ConnectorState).target.owner
			) {
				return {
					...state,
					objects:
						original?.type === "connector"
							? { ...state.objects, [editingConnectorId]: original }
							: state.objects,
					editingConnectorId: null,
					editingEndpoint: null,
					edgeScrollEnabled: false,
				};
			}

			const isNoOp =
				original?.type === "connector" &&
				finalConnector?.type === "connector" &&
				isSameConnectorEndpoints(
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
			// 新規コネクターは図形と同じ扱いで最前面へ挿入する（新規作成は前面が普遍的な既定）。
			// rootIds は背面→前面順なので末尾へ追加する。
			rootIds: [...dragResult.rootIds, finalConnector.id],
			pendingConnector: null,
			editingEndpoint: null,
			edgeScrollEnabled: false,
			commitVersion: state.commitVersion + 1,
		};
	}
}
