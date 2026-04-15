import {
	calcEuclideanDistance,
	calcFrameKeyPoints,
	isTransformedFrame,
	roundToDecimal,
} from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type { CanvasEvent } from "../../../../../registry/GestureHandlerRegistryTypes";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { ControlStrategy } from "../ControlEventHandler";

type AnchorPosition =
	| "topCenter"
	| "rightCenter"
	| "bottomCenter"
	| "leftCenter";

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

		// ジェスチャータイプに応じて処理
		if (event.type === "dragStart") {
			return this.handleDragStart(state, event);
		} else if (event.type === "drag") {
			return this.handleDrag(state, event);
		} else if (event.type === "dragEnd") {
			return this.handleDragEnd(state, event);
		}

		return state;
	}

	/**
	 * Connection anchor でのドラッグ開始を処理する。
	 * 新しいコネクターの作成を開始する。
	 */
	private handleDragStart(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		const targetId = event.targetId;
		if (!targetId) {
			return state;
		}

		// Parse anchor ID: "connection-anchor:<objectId>:<anchorPosition>"
		const parts = targetId.split(":");
		if (parts.length !== 3 || parts[0] !== "connection-anchor") {
			return state;
		}

		const [, sourceObjectId, anchorPosition] = parts;
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
	private handleDrag(
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

		// If hovering over a valid target, preview as connected (OwnedEndpointRef).
		// Use the nearest connect-point (topCenter/rightCenter/bottomCenter/leftCenter)
		// or center, whichever is closest to the current cursor position.
		const targetObjectId = validHoveredIds[0];
		const targetObject = targetObjectId ? state.objects[targetObjectId] : null;

		const previewTarget: ConnectorState["target"] = targetObject
			? {
					owner: { type: targetObject.type, id: targetObjectId },
					anchor: this.calcNearestAnchor(
						targetObject,
						event.last.x,
						event.last.y,
					),
				}
			: updatedConnector.target;

		return {
			...state,
			pendingConnector: { ...updatedConnector, target: previewTarget },
			hoveredIds: validHoveredIds,
		};
	}

	/**
	 * Connection anchor でのドラッグ終了を処理する。
	 * hover 中のオブジェクトがあればコネクターを確定し、なければキャンセル。
	 */
	private handleDragEnd(
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
					anchor: this.calcNearestAnchor(
						targetObject,
						event.last.x,
						event.last.y,
					),
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
	 * カーソル位置に最も近いアンカーを返す。
	 * フレームを持つオブジェクトは 4 中点 + center から選択し、
	 * フレームを持たないオブジェクトは center を返す。
	 */
	private calcNearestAnchor(
		obj: { cx?: number; cy?: number; [key: string]: unknown },
		cursorX: number,
		cursorY: number,
	): { kind: "center" } | { kind: "connectPoint"; id: string } {
		if (!isTransformedFrame(obj)) {
			return { kind: "center" };
		}

		const keyPoints = calcFrameKeyPoints(obj);

		const candidates: Array<{
			id: string | null;
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
