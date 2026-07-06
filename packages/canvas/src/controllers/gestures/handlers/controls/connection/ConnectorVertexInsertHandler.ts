import { roundToDecimal } from "@workspace/geometry";
import type { Point } from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import { isPoly } from "../../../../../schemas/objects/types/Poly";
import type {
	CanvasControllerState,
	SnapFeedback,
} from "../../../../CanvasTypes";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../../../utils/snap/findSnap";
import type { ControlStrategy } from "../ControlEventHandler";

/**
 * Handles inserting an intermediate waypoint into a connector segment.
 *
 * Control ID format: "connector-vertex-insert:<connectorId>:<segmentIndex>"
 *
 * `segmentIndex` is the segment number of the rendered path `[source, ...waypoints, target]`
 * (endpoints included). Because endpoints are not part of `points` (waypoints only), the insertion
 * position differs by 1 from the polyline VertexInsertHandler (`splice(segmentIndex + 1)`), becoming
 * `splice(segmentIndex)`.
 *
 * - segment 0 = source → waypoints[0]  → insert at the front of waypoints
 * - segment k = waypoints[k-1] → waypoints[k] → insert at the position of waypoints[k]
 * - segment n = waypoints[n-1] → target → append at the end of waypoints
 *
 * This allows placing the first bend point even on a straight connector (empty waypoints, a single segment).
 *
 * Behavior:
 * - dragStart: insert a new waypoint into the specified segment
 * - drag: move the inserted waypoint (with snap correction)
 * - dragEnd: commit the final position
 */
export class ConnectorVertexInsertHandler implements ControlStrategy {
	readonly controlType = "connector-vertex-insert";

	supports(event: CanvasEvent): boolean {
		if (event.targetKind !== "control") {
			return false;
		}
		const targetPart = event.targetPart;
		return !!targetPart && targetPart.startsWith("waypoint-insert:");
	}

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		// Only handle left-click (button 0)
		if (event.button !== 0) {
			return state;
		}

		// targetId = connectorId, targetPart = "waypoint-insert:<segmentIndex>"
		const connectorId = event.targetId;
		const targetPart = event.targetPart;
		if (!connectorId || !targetPart) {
			return state;
		}

		const segmentIndex = parseInt(
			targetPart.slice("waypoint-insert:".length),
			10,
		);
		if (isNaN(segmentIndex) || segmentIndex < 0) {
			return state;
		}

		if (event.type === "dragStart") {
			return this.handleDragStart(state, event, connectorId, segmentIndex);
		} else if (event.type === "drag") {
			return this.handleDrag(state, event, connectorId, segmentIndex);
		} else if (event.type === "dragEnd") {
			return this.handleDragEnd(state, event, connectorId, segmentIndex);
		}

		return state;
	}

	/**
	 * Inserts a new waypoint at the specified segment position (segmentIndex) and also updates
	 * eventStartSnapshot so that subsequent drags can reference the new vertex.
	 */
	private handleDragStart(
		state: CanvasControllerState,
		event: CanvasEvent,
		connectorId: string,
		segmentIndex: number,
	): CanvasControllerState {
		const connector = state.objects[connectorId];
		if (!isPoly(connector) || connector.type !== "connector") {
			return state;
		}

		const currentPoints = connector.points;
		// The number of path segments is waypoints.length + 1. Ignore out-of-range indices.
		if (segmentIndex < 0 || segmentIndex > currentPoints.length) {
			return state;
		}

		const newPosition: Point = {
			x: roundToDecimal(event.last.x, PRECISION.COORDINATE),
			y: roundToDecimal(event.last.y, PRECISION.COORDINATE),
		};

		const newPoints = [...currentPoints];
		newPoints.splice(segmentIndex, 0, newPosition);

		const updatedConnector = { ...connector, points: newPoints };
		const updatedObjects = {
			...state.objects,
			[connectorId]: updatedConnector,
		};

		const nextState: CanvasControllerState = {
			...state,
			objects: updatedObjects,
			selectedVertex: null,
			edgeScrollEnabled: true,
		};

		if (state.eventStartSnapshot) {
			nextState.eventStartSnapshot = {
				...state.eventStartSnapshot,
				objects: updatedObjects,
			};
		}

		return nextState;
	}

	/**
	 * Moves the inserted waypoint (index = segmentIndex).
	 */
	private handleDrag(
		state: CanvasControllerState,
		event: CanvasEvent,
		connectorId: string,
		segmentIndex: number,
	): CanvasControllerState {
		const eventStartSnapshot = state.eventStartSnapshot;
		if (!eventStartSnapshot) {
			return state;
		}

		// Get the starting state from the snapshot that already includes the waypoint inserted at dragStart.
		const startConnector = eventStartSnapshot.objects[connectorId];
		if (!isPoly(startConnector) || startConnector.type !== "connector") {
			return state;
		}

		const insertedIndex = segmentIndex;
		if (insertedIndex >= startConnector.points.length) {
			return state;
		}

		// --- Snap correction between objects ---
		let cursorX = event.last.x;
		let cursorY = event.last.y;
		const snapCandidates = eventStartSnapshot.snapCandidates;
		let snapFeedback: SnapFeedback = { x: [], y: [] };

		if (snapCandidates && !event.mods.ctrl) {
			const zoom = state.viewport.zoom;
			const result = findSnap(
				snapCandidates,
				SNAP_THRESHOLD_PX / zoom,
				[cursorX],
				[cursorY],
			);
			cursorX += result.delta.x;
			cursorY += result.delta.y;
			const pointBBox = {
				left: cursorX,
				right: cursorX,
				top: cursorY,
				bottom: cursorY,
			};
			snapFeedback = buildSnapFeedback(
				pointBBox,
				result.xResult,
				result.yResult,
				snapCandidates,
			);
		}

		const newPosition: Point = {
			x: roundToDecimal(cursorX, PRECISION.COORDINATE),
			y: roundToDecimal(cursorY, PRECISION.COORDINATE),
		};

		const newPoints = [...startConnector.points];
		newPoints[insertedIndex] = newPosition;

		const updatedConnector = { ...startConnector, points: newPoints };
		return {
			...state,
			objects: {
				...state.objects,
				[connectorId]: updatedConnector,
			},
			snapFeedback,
		};
	}

	/**
	 * Commits the final position.
	 */
	private handleDragEnd(
		state: CanvasControllerState,
		event: CanvasEvent,
		connectorId: string,
		segmentIndex: number,
	): CanvasControllerState {
		const nextState = this.handleDrag(
			{ ...state },
			event,
			connectorId,
			segmentIndex,
		);

		return {
			...nextState,
			edgeScrollEnabled: false,
		};
	}
}
