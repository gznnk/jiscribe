import { roundToDecimal } from "@workspace/geometry";
import type { Point } from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import { isPoly } from "../../../../../schemas/objects/types/Poly";
import type {
	CanvasControllerState,
	SnapFeedback,
} from "../../../../CanvasTypes";
import { updateGroupBoundsFromRoot } from "../../../../utils/updateGroupBoundsFromRoot";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../../../utils/snap/findSnap";
import type { ControlStrategy } from "../ControlEventHandler";

/**
 * Handles vertex-insert control operations (adding a vertex to a segment).
 *
 * Target format: data-id=<objectId>, data-part="vertex-insert:<segmentIndex>"
 * Example: data-part="vertex-insert:0" (the segment between points[0] and points[1])
 *
 * Behavior:
 * - dragStart: add a new vertex to the specified segment
 * - drag: move the newly added vertex
 * - dragEnd: commit the final position
 */
export class VertexInsertHandler implements ControlStrategy {
	readonly controlType = "vertex-insert";

	supports(event: CanvasEvent): boolean {
		if (event.targetKind !== "control") {
			return false;
		}

		const targetPart = event.targetPart;
		if (!targetPart) {
			return false;
		}

		// Check whether it is a vertex-insert
		return targetPart.startsWith("vertex-insert:");
	}

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		// Only handle left-click (button 0)
		if (event.button !== 0) {
			return state;
		}

		// targetId = objectId, targetPart = "vertex-insert:<segmentIndex>"
		const objectId = event.targetId;
		const targetPart = event.targetPart;
		if (!objectId || !targetPart) {
			return state;
		}

		const segmentIndex = parseInt(
			targetPart.slice("vertex-insert:".length),
			10,
		);

		if (isNaN(segmentIndex) || segmentIndex < 0) {
			return state;
		}

		// Add a vertex on dragStart, then move that vertex on drag/dragEnd
		if (event.type === "dragStart") {
			return this.handleDragStart(state, event, objectId, segmentIndex);
		} else if (event.type === "drag") {
			return this.handleDrag(state, event, objectId, segmentIndex);
		} else if (event.type === "dragEnd") {
			return this.handleDragEnd(state, event, objectId, segmentIndex);
		}

		return state;
	}

	/**
	 * Handles drag start on the vertex-insert control.
	 * Adds a new vertex and updates eventStartSnapshot so the next drag event can reference it.
	 */
	private handleDragStart(
		state: CanvasControllerState,
		event: CanvasEvent,
		objectId: string,
		segmentIndex: number,
	): CanvasControllerState {
		const currentObject = state.objects[objectId];
		if (!isPoly(currentObject)) {
			return state;
		}

		if (segmentIndex < 0 || segmentIndex >= currentObject.points.length) {
			return state;
		}

		// Add a new vertex at the drag start position
		const newPosition: Point = {
			x: roundToDecimal(event.last.x, PRECISION.COORDINATE),
			y: roundToDecimal(event.last.y, PRECISION.COORDINATE),
		};

		// Insert the vertex (added at the segmentIndex + 1 position)
		const newPoints = [...currentObject.points];
		newPoints.splice(segmentIndex + 1, 0, newPosition);

		const updatedObject = {
			...currentObject,
			points: newPoints,
		};

		// Create a new state with the updated objects
		const updatedObjects = {
			...state.objects,
			[objectId]: updatedObject,
		};

		const nextState: CanvasControllerState = {
			...state,
			objects: updatedObjects,
			selectedVertex: null,
			edgeScrollEnabled: true,
		};

		// Update eventStartSnapshot so the drag event can reference the state including the new vertex
		if (state.eventStartSnapshot) {
			nextState.eventStartSnapshot = {
				...state.eventStartSnapshot,
				objects: updatedObjects,
			};
		}

		return nextState;
	}

	/**
	 * Handles dragging on the vertex-insert control.
	 * Moves the newly added vertex (at the segmentIndex + 1 position).
	 */
	private handleDrag(
		state: CanvasControllerState,
		event: CanvasEvent,
		objectId: string,
		segmentIndex: number,
	): CanvasControllerState {
		const eventStartSnapshot = state.eventStartSnapshot;
		if (!eventStartSnapshot) {
			return state;
		}

		// Get the start object from the eventStartSnapshot updated on dragStart
		// (the state including the newly added vertex)
		const startObject = eventStartSnapshot.objects[objectId];
		if (!isPoly(startObject)) {
			return state;
		}

		// The index of the newly added vertex is segmentIndex + 1
		const newVertexIndex = segmentIndex + 1;

		// Prevent writing to an out-of-range vertex index
		// (always in range if a vertex was inserted on dragStart)
		if (newVertexIndex >= startObject.points.length) {
			return state;
		}

		// Snap correction
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

		// Compute the new vertex position
		const newPosition: Point = {
			x: roundToDecimal(cursorX, PRECISION.COORDINATE),
			y: roundToDecimal(cursorY, PRECISION.COORDINATE),
		};

		// Update the vertex position
		const newPoints = [...startObject.points];
		newPoints[newVertexIndex] = newPosition;

		const updatedObject = {
			...startObject,
			points: newPoints,
		};

		return {
			...state,
			objects: {
				...state.objects,
				[objectId]: updatedObject,
			},
			snapFeedback,
		};
	}

	/**
	 * Handles drag end on the vertex-insert control.
	 * Commits the final position and updates the group's bounds.
	 */
	private handleDragEnd(
		state: CanvasControllerState,
		event: CanvasEvent,
		objectId: string,
		segmentIndex: number,
	): CanvasControllerState {
		// Apply the drag-time state update to compute the final state
		let nextState = this.handleDrag(
			{ ...state },
			event,
			objectId,
			segmentIndex,
		);

		// If it belongs to a group, update the group's bounds
		const updatedObject = nextState.objects[objectId];
		if (updatedObject?.parentId) {
			nextState = updateGroupBoundsFromRoot(nextState, updatedObject.parentId);
		}

		return {
			...nextState,
			edgeScrollEnabled: false,
		};
	}
}
