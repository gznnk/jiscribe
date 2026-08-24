import { isPoly } from "@jiscribe/doc/model/objects/types/Poly";
import type { Point } from "@jiscribe/geometry";

import type {
	CanvasControllerState,
	SnapFeedback,
} from "../../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../../registries/ICanvasRegistries";
import { createCowObjects } from "../../../../utils/cowObjects";
import { ControlStrategy } from "../../../registry/ControlStrategy";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../../utils/snap/findSnap";
import { isSnapSuppressed } from "../../utils/snap/isSnapSuppressed";
import { startConnectorLabelEdit } from "../../utils/startConnectorLabelEdit";

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
 * - doubleClick: start label editing. The handle sits on the path (a segment
 *   midpoint coincides with the default label placement), so a double click
 *   aimed at the line or the label box can land here; it means "double click
 *   the connector", not "insert a waypoint" (which is drag-only).
 */
export class ConnectorVertexInsertHandler extends ControlStrategy {
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
		registries: ICanvasRegistries,
	): CanvasControllerState {
		// targetId = connectorId, targetPart = "waypoint-insert:<segmentIndex>"
		const connectorId = event.targetId;
		const targetPart = event.targetPart;
		if (!connectorId || !targetPart) {
			return state;
		}

		// The label box shares the connector's data-id with this handle, but the
		// pressed control is excluded from the hover stack before the id-dedup
		// (see getHoveredElements), so the box is visible here when hit.
		if (event.type === "doubleClick") {
			const isLabelBoxHit = event
				.getHovered()
				.some(
					(hovered) =>
						hovered.kind === "connector" &&
						hovered.id === connectorId &&
						hovered.part === "label",
				);
			return startConnectorLabelEdit(
				state,
				connectorId,
				event,
				isLabelBoxHit,
				registries,
			);
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

		const newPosition: Point = { x: event.last.x, y: event.last.y };

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

		if (snapCandidates && !isSnapSuppressed(event)) {
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

		const newPosition: Point = { x: cursorX, y: cursorY };

		const newPoints = [...startConnector.points];
		newPoints[insertedIndex] = newPosition;

		const updatedConnector = { ...startConnector, points: newPoints };
		// COW view over the previous frame's map (rebased internally, #213)
		const updatedObjects = createCowObjects(state.objects);
		updatedObjects[connectorId] = updatedConnector;

		return {
			...state,
			objects: updatedObjects,
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
