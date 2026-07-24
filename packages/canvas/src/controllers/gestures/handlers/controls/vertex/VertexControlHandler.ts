import { roundToDecimal } from "@workspace/geometry";
import type { Point } from "@workspace/geometry";

import { ORIGIN_SNAP_PX } from "../../../../../constants/axisLock";
import { PRECISION } from "../../../../../constants/precision";
import { isPoly } from "../../../../../schemas/objects/types/Poly";
import type {
	AxisLockFeedback,
	CanvasControllerState,
	SnapFeedback,
} from "../../../../CanvasTypes";
import { createCowObjects } from "../../../../utils/cowObjects";
import { updateGroupBoundsFromRoot } from "../../../../utils/updateGroupBoundsFromRoot";
import { ControlStrategy } from "../../../registry/ControlStrategy";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../../utils/snap/findSnap";

/**
 * Handles vertex control interactions (moving a vertex).
 *
 * Target format: data-id=<objectId>, data-part="vertex:<vertexIndex>"
 * Example: data-part="vertex:0"
 */
export class VertexControlHandler extends ControlStrategy {
	supports(event: CanvasEvent): boolean {
		if (event.targetKind !== "control") {
			return false;
		}

		const targetPart = event.targetPart;
		if (!targetPart) {
			return false;
		}

		// Check whether this is a vertex control
		return targetPart.startsWith("vertex:");
	}

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		// targetId = objectId, targetPart = "vertex:<vertexIndex>"
		const objectId = event.targetId;
		const targetPart = event.targetPart;
		if (!objectId || !targetPart) {
			return state;
		}

		const vertexIndex = parseInt(targetPart.slice("vertex:".length), 10);

		if (isNaN(vertexIndex) || vertexIndex < 0) {
			return state;
		}

		// Route to the appropriate handler based on the gesture type
		let nextState = state;

		if (event.type === "click") {
			nextState = this.handleClick(nextState, objectId, vertexIndex);
		} else if (event.type === "dragStart") {
			nextState = this.handleDragStart(nextState, event);
		} else if (event.type === "drag") {
			nextState = this.handleDrag(nextState, event, objectId, vertexIndex);
		} else if (event.type === "dragEnd") {
			nextState = this.handleDragEnd(nextState, event, objectId, vertexIndex);
		}

		return nextState;
	}

	/**
	 * Handles a vertex control click. Selects the clicked vertex.
	 */
	private handleClick(
		state: CanvasControllerState,
		objectId: string,
		vertexIndex: number,
	): CanvasControllerState {
		const targetObject = state.objects[objectId];
		if (!isPoly(targetObject) || vertexIndex >= targetObject.points.length) {
			return state;
		}

		return {
			...state,
			selectedVertex: { objectId, vertexIndex },
			objectMenuOpenId: null,
			stencilLibraryOpenCategory: null,
		};
	}

	/**
	 * Handles the start of a drag on a vertex control.
	 */
	private handleDragStart(
		state: CanvasControllerState,
		_event: CanvasEvent,
	): CanvasControllerState {
		return {
			...state,
			selectedVertex: null,
			edgeScrollEnabled: true,
			objectMenuOpenId: null,
			stencilLibraryOpenCategory: null,
		};
	}

	/**
	 * Handles a drag on a vertex control.
	 */
	private handleDrag(
		state: CanvasControllerState,
		event: CanvasEvent,
		objectId: string,
		vertexIndex: number,
	): CanvasControllerState {
		const eventStartSnapshot = state.eventStartSnapshot;
		if (!eventStartSnapshot) {
			return state;
		}

		const startObject = eventStartSnapshot.objects[objectId];
		if (!isPoly(startObject)) {
			return state;
		}

		// Prevent writing to an out-of-range vertex index
		if (vertexIndex >= startObject.points.length) {
			return state;
		}

		const startPoint = startObject.points[vertexIndex];
		const zoom = state.viewport.zoom;

		// --- Axis lock via Shift ---
		// Relative to the starting vertex position, move only along the axis with the larger displacement (lock the smaller axis).
		// Since the decision is based on the cumulative amount, the locked axis follows if the dominant axis swaps during the drag.
		const dx = event.last.x - startPoint.x;
		const dy = event.last.y - startPoint.y;
		const lockedAxis: "x" | "y" | null = event.mods.shift
			? Math.abs(dx) >= Math.abs(dy)
				? "y"
				: "x"
			: null;

		// While axis-locked, if the free-axis displacement is tiny, snap to the starting vertex and show both-axis guides.
		const freeAxisDelta = lockedAxis === "x" ? dy : dx;
		const snapToOrigin =
			lockedAxis !== null && Math.abs(freeAxisDelta) <= ORIGIN_SNAP_PX / zoom;

		// Cursor position reflecting the axis lock (the locked axis / origin snap is replaced with the starting vertex coordinate)
		let cursorX = event.last.x;
		let cursorY = event.last.y;
		if (lockedAxis === "x" || snapToOrigin) {
			cursorX = startPoint.x;
		}
		if (lockedAxis === "y" || snapToOrigin) {
			cursorY = startPoint.y;
		}

		// --- Snap correction between objects (skipped while axis-locked / origin-snapping) ---
		const snapCandidates = eventStartSnapshot.snapCandidates;
		let snapFeedback: SnapFeedback = { x: [], y: [] };

		if (snapCandidates && !event.mods.ctrl && !snapToOrigin) {
			const result = findSnap(
				snapCandidates,
				SNAP_THRESHOLD_PX / zoom,
				lockedAxis === "x" ? [] : [cursorX],
				lockedAxis === "y" ? [] : [cursorY],
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

		// --- Shift axis-lock feedback (full-viewport guides) ---
		// The locked axis is a line through the starting vertex's coordinate. During origin snap, show both axes (a crosshair).
		let axisLockFeedback: AxisLockFeedback | null = null;
		if (lockedAxis) {
			if (snapToOrigin) {
				axisLockFeedback = { x: startPoint.x, y: startPoint.y };
			} else if (lockedAxis === "y") {
				axisLockFeedback = { y: startPoint.y };
			} else {
				axisLockFeedback = { x: startPoint.x };
			}
		}

		// Compute the new vertex position
		const newPosition: Point = {
			x: roundToDecimal(cursorX, PRECISION.COORDINATE),
			y: roundToDecimal(cursorY, PRECISION.COORDINATE),
		};

		// Update the vertex position
		const newPoints = [...startObject.points];
		newPoints[vertexIndex] = newPosition;

		const updatedObject = {
			...startObject,
			points: newPoints,
		};

		// COW view over the previous frame's map (rebased internally, #213)
		const updatedObjects = createCowObjects(state.objects);
		updatedObjects[objectId] = updatedObject;

		return {
			...state,
			objects: updatedObjects,
			snapFeedback,
			axisLockFeedback,
		};
	}

	/**
	 * Handles the end of a drag on a vertex control.
	 */
	private handleDragEnd(
		state: CanvasControllerState,
		event: CanvasEvent,
		objectId: string,
		vertexIndex: number,
	): CanvasControllerState {
		// Apply the drag-time state update to compute the final state.
		// handleDrag never mutates its argument, so the state can be passed as is.
		let nextState = this.handleDrag(state, event, objectId, vertexIndex);

		// If it belongs to a group, update the group's bounds
		const updatedObject = nextState.objects[objectId];
		if (updatedObject?.parentId) {
			nextState = updateGroupBoundsFromRoot(nextState, updatedObject.parentId);
		}

		return {
			...nextState,
			edgeScrollEnabled: false, // Disable edge scrolling on drag end
		};
	}
}
