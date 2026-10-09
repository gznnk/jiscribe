import { isPoly } from "@jiscribe/doc/model/objects/types/Poly";
import type { Point } from "@jiscribe/geometry";

import type {
	CanvasControllerState,
	SnapFeedback,
} from "../../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../../registries/ICanvasRegistries";
import { VERTEX_PART_KIND } from "../../../../selection/createVertexPartKindDefinition";
import { commitEdit } from "../../../../utils/commitEdit";
import { createCowObjects } from "../../../../utils/cowObjects";
import { updateGroupBoundsFromRoot } from "../../../../utils/updateGroupBoundsFromRoot";
import { ControlStrategy } from "../../../registry/ControlStrategy";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { applyPartClick } from "../../utils/applyPartClick";
import { applyAxisLock } from "../../utils/axisLock";
import { parsePartAddress } from "../../utils/partAddress";
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
 * Target format: data-id=<objectId>, data-part=vertexPart(<vertexIndex>)
 * Example: data-part="vertex:0"
 */
export class VertexControlHandler extends ControlStrategy {
	supports(event: CanvasEvent): boolean {
		return (
			event.targetKind === "control" &&
			parsePartAddress(event.targetPart)?.kind === VERTEX_PART_KIND
		);
	}

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
		registries: ICanvasRegistries,
	): CanvasControllerState {
		const objectId = event.targetId;
		const targetPart = event.targetPart;
		if (!objectId || !targetPart) {
			return state;
		}

		// A click only addresses the vertex, so the whole of it — range check
		// included — is the shared part-click path.
		if (event.type === "click") {
			// The handles are drawn for the sole selected object only, so a handle
			// naming another one is stale DOM and addresses nothing.
			const { objectIds } = state.selection;
			const targetObject =
				objectIds.length === 1 && objectIds[0] === objectId
					? state.objects[objectId]
					: undefined;
			if (!targetObject) {
				return state;
			}
			return applyPartClick(
				state,
				targetObject,
				targetPart,
				registries.objectPartKind,
			);
		}

		// Only the drags read the id back as the index into `points`.
		const vertexIndex = parseInt(
			parsePartAddress(targetPart)?.partId ?? "",
			10,
		);
		if (isNaN(vertexIndex) || vertexIndex < 0) {
			return state;
		}

		if (event.type === "dragStart") {
			return this.handleDragStart(state, objectId);
		}
		if (event.type === "drag") {
			return this.handleDrag(state, event, objectId, vertexIndex);
		}
		if (event.type === "dragEnd") {
			return this.handleDragEnd(state, event, objectId, vertexIndex);
		}

		return state;
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
			selection: { ...state.selection, part: null },
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
		const draggedState = this.handleDrag(state, event, objectId, vertexIndex);
		let nextState = draggedState;

		// If it belongs to a group, update the group's bounds
		const updatedObject = nextState.objects[objectId];
		if (updatedObject?.parentId) {
			nextState = updateGroupBoundsFromRoot(nextState, updatedObject.parentId);
		}

		const closedState = {
			...nextState,
			edgeScrollEnabled: false, // Disable edge scrolling on drag end
		};
		// handleDrag hands `state` back only when it found nothing to write
		return draggedState === state ? closedState : commitEdit(closedState);
	}
}
