import { isPoly } from "@jiscribe/doc/model/objects/types/Poly";
import type { Point } from "@jiscribe/geometry";

import type {
	CanvasControllerState,
	SnapFeedback,
} from "../../../../CanvasTypes";
import { VERTEX_PART_KIND } from "../../../../selection/createVertexPartKindDefinition";
import { createCowObjects } from "../../../../utils/cowObjects";
import { updateGroupBoundsFromRoot } from "../../../../utils/updateGroupBoundsFromRoot";
import { ControlStrategy } from "../../../registry/ControlStrategy";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { applyAxisLock } from "../../utils/axisLock";
import { excludeCenterCandidates } from "../../utils/snap/excludeCenterCandidates";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../../utils/snap/findSnap";
import { isSnapSuppressed } from "../../utils/snap/isSnapSuppressed";

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
			nextState = this.handleDragStart(nextState, objectId);
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
			objectPartSelection: {
				objectId,
				kind: VERTEX_PART_KIND,
				// A click picks the one vertex it landed on, so the range is collapsed
				// and it is the whole selection: anything already picked is replaced.
				ranges: [
					{ anchorId: String(vertexIndex), focusId: String(vertexIndex) },
				],
			},
			objectMenuOpenId: null,
			stencilLibraryOpenCategory: null,
		};
	}

	/**
	 * Handles the start of a drag on a vertex control.
	 * Drops the edited object's own center from this drag's snap candidates, since the
	 * center moves with the vertex; the drag-start cache is left untouched.
	 */
	private handleDragStart(
		state: CanvasControllerState,
		objectId: string,
	): CanvasControllerState {
		const nextState: CanvasControllerState = {
			...state,
			objectPartSelection: null,
			edgeScrollEnabled: true,
			objectMenuOpenId: null,
			stencilLibraryOpenCategory: null,
		};

		const startSnapshot = state.activeDrag?.startSnapshot;
		if (state.activeDrag && startSnapshot?.snapCandidates) {
			nextState.activeDrag = {
				...state.activeDrag,
				startSnapshot: {
					...startSnapshot,
					snapCandidates: excludeCenterCandidates(
						startSnapshot.snapCandidates,
						objectId,
					),
				},
			};
		}

		return nextState;
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
		const dragStartSnapshot = state.activeDrag?.startSnapshot;
		if (!dragStartSnapshot) {
			return state;
		}

		const startObject = dragStartSnapshot.objects[objectId];
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
		// While axis-locked, a tiny free-axis displacement snaps to the starting vertex (crosshair guides).
		const axisLock = applyAxisLock(startPoint, event.last, {
			shift: event.mods.shift,
			zoom,
			originSnap: true,
		});
		const { lockedAxis, snapToOrigin } = axisLock;
		let cursorX = axisLock.point.x;
		let cursorY = axisLock.point.y;

		// --- Snap correction between objects (free axis only while axis-locked; skipped on origin snap) ---
		const snapCandidates = dragStartSnapshot.snapCandidates;
		let snapFeedback: SnapFeedback = { x: [], y: [] };

		if (snapCandidates && !isSnapSuppressed(event) && !snapToOrigin) {
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

		// Compute the new vertex position
		const newPosition: Point = { x: cursorX, y: cursorY };

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
			axisLockFeedback: axisLock.feedback,
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
