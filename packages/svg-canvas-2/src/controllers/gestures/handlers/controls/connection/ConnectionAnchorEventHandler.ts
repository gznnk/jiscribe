import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../../../../registry/GestureHandlerRegistryTypes";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { commitTextEditIfNeeded } from "../../../../utils/commitTextEditIfNeeded";

type AnchorPosition =
	| "topCenter"
	| "rightCenter"
	| "bottomCenter"
	| "leftCenter";

/**
 * Connection anchor でのドラッグ開始を処理する。
 * 新しいコネクターの作成を開始する。
 */
function handleDragStart(
	state: CanvasControllerState,
	event: CanvasEvent,
): CanvasControllerState {
	const targetId = event.targetId;
	if (!targetId) {
		return state;
	}

	// Parse anchor ID: "<objectId>:<anchorPosition>"
	const parts = targetId.split(":");
	if (parts.length !== 2) {
		return state;
	}

	const [sourceObjectId, anchorPosition] = parts;
	const sourceObject = state.objects[sourceObjectId];

	if (!sourceObject) {
		return state;
	}

	// Validate anchor position
	const validPositions: AnchorPosition[] = [
		"topCenter",
		"rightCenter",
		"bottomCenter",
		"leftCenter",
	];
	if (!validPositions.includes(anchorPosition as AnchorPosition)) {
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
			anchor: { kind: "connectPoint", id: anchorPosition },
		},
		target: {
			anchor: { kind: "free", point: { x: event.last.x, y: event.last.y } },
		},
		stroke: "#6366f1", // indigo-500
		strokeWidth: 2,
	} as ConnectorState;

	return {
		...state,
		pendingConnector,
		edgeScrollEnabled: true,
		// Clear any selection to avoid confusion
		selectedIds: [],
		multiSelectGroup: null,
	};
}

/**
 * Connection anchor からのドラッグ中の処理。
 * コネクターの終点を更新し、hover 判定を行う。
 */
function handleDrag(
	state: CanvasControllerState,
	event: CanvasEvent,
): CanvasControllerState {
	const { pendingConnector } = state;

	if (!pendingConnector) {
		return state;
	}

	// Update the target point to the current mouse position
	const updatedConnector: ConnectorState = {
		...pendingConnector,
		target: {
			anchor: {
				kind: "free",
				point: {
					x: roundToDecimal(event.last.x, PRECISION.COORDINATE),
					y: roundToDecimal(event.last.y, PRECISION.COORDINATE),
				},
			},
		},
	} as ConnectorState;

	// Get the source object ID to exclude it from hover detection
	const sourceObjectId = pendingConnector.source.owner?.id;

	// Filter hoveredIds to exclude:
	// - The source object itself (can't connect to self)
	// - Connectors (for now, only allow connecting to shapes)
	const validHoveredIds = event.hovered
		.map((h) => h.id)
		.filter((id: string) => {
			if (id === sourceObjectId) {
				return false;
			}
			const obj = state.objects[id];
			return obj && obj.type !== "connector";
		});

	return {
		...state,
		pendingConnector: updatedConnector,
		hoveredIds: validHoveredIds,
	};
}

/**
 * Connection anchor でのドラッグ終了を処理する。
 * hover 中のオブジェクトがあればコネクターを確定し、なければキャンセル。
 */
function handleDragEnd(
	state: CanvasControllerState,
	event: CanvasEvent,
): CanvasControllerState {
	const { pendingConnector, hoveredIds } = state;

	if (!pendingConnector) {
		return {
			...state,
			edgeScrollEnabled: false,
		};
	}

	// Check if there's a valid target object under the cursor
	const targetObjectId = hoveredIds[0];
	const targetObject = targetObjectId ? state.objects[targetObjectId] : null;

	// If there's a valid target, finalize the connector
	if (targetObject && targetObject.type !== "connector") {
		const finalConnector: ConnectorState = {
			...pendingConnector,
			target: {
				owner: { type: targetObject.type, id: targetObjectId },
				anchor: { kind: "center" }, // For now, always connect to center
			},
		} as ConnectorState;

		return {
			...state,
			objects: {
				...state.objects,
				[finalConnector.id]: finalConnector,
			},
			connectorIds: [...state.connectorIds, finalConnector.id],
			pendingConnector: null,
			hoveredIds: [],
			edgeScrollEnabled: false,
			lastCommitTime: event.time,
		};
	}

	// No valid target, cancel the connector creation
	return {
		...state,
		pendingConnector: null,
		hoveredIds: [],
		edgeScrollEnabled: false,
	};
}

/**
 * Connection anchor からのドラッグでコネクターを作成するハンドラー。
 *
 * Anchor ID フォーマット: "<objectId>:<anchorPosition>"
 * 例: "rect-1:topCenter"
 */
export const ConnectionAnchorEventHandler: GestureHandler = {
	supports(event): boolean {
		return event.targetKind === "connection-anchor";
	},

	handle(state, event) {
		// Commit text editing if active
		const nextState = commitTextEditIfNeeded(state, event.time);

		// Only handle left-click (button 0)
		if (event.button !== 0) {
			return nextState;
		}

		// ジェスチャータイプに応じて処理
		if (event.type === "dragStart") {
			return handleDragStart(nextState, event);
		} else if (event.type === "drag") {
			return handleDrag(nextState, event);
		} else if (event.type === "dragEnd") {
			return handleDragEnd(nextState, event);
		}

		return nextState;
	},
};
