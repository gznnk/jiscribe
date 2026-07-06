import type { FrameKeyPoints, TransformedFrame } from "@workspace/geometry";
import {
	calcAffineTransformedPoint,
	calcFrameKeyPoints,
	degreesToRadians,
	isTransformedFrame,
	roundToDecimal,
} from "@workspace/geometry";

import type { TransformAnchorType } from "./TransformAnchorType";
import { applyResizeSnap } from "./utils/applyResizeSnap";
import { calcAnchorResize } from "./utils/calcAnchorResize";
import { calcMultiSelectGroupBounds } from "./utils/calcMultiSelectGroupBounds";
import { handleRotationDrag } from "./utils/handleRotationDrag";
import { updateSingleGroupBounds } from "./utils/updateSingleGroupBounds";
import { PRECISION } from "../../../../../constants/precision";
import type { TransformState } from "../../../../../states/objects/base/TransformState";
import { isTransformState } from "../../../../../states/objects/base/TransformState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import type {
	CanvasControllerState,
	SnapFeedback,
} from "../../../../CanvasTypes";
import { updateGroupBoundsFromRoot } from "../../../../utils/updateGroupBoundsFromRoot";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { transformChildren } from "../../objects/primitives/GroupController";
import type { ControlStrategy } from "../ControlEventHandler";

/**
 * Handles transform-control operations (resize and rotation).
 *
 * Target format: data-id="transform", data-part="resize:<anchorType>" / "rotation"
 * Example: data-part="resize:bottomRight"
 */
export class TransformControlHandler implements ControlStrategy {
	readonly controlType = "transform-control";

	supports(event: CanvasEvent): boolean {
		if (event.targetKind !== "control") {
			return false;
		}

		const targetPart = event.targetPart;
		if (!targetPart) {
			return false;
		}

		// Resize handles and the rotation handle of the transform frame
		return targetPart.startsWith("resize:") || targetPart === "rotation";
	}

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		// Only handle left-click (button 0)
		if (event.button !== 0) {
			return state;
		}

		const targetPart = event.targetPart;
		if (!targetPart) {
			return state;
		}

		// Parse the anchor type from "resize:<anchorType>" / "rotation"
		const anchorType = (
			targetPart === "rotation"
				? "rotation"
				: targetPart.slice("resize:".length)
		) as TransformAnchorType;

		// Route to the appropriate handler based on the gesture type
		let nextState = state;

		if (event.type === "dragStart") {
			nextState = this.handleDragStart(nextState, event, anchorType);
		} else if (event.type === "drag") {
			nextState = this.handleDrag(nextState, event, anchorType);
		} else if (event.type === "dragEnd") {
			nextState = this.handleDragEnd(nextState, event, anchorType);
		}

		return nextState;
	}

	/**
	 * Handles drag start on a transform-control anchor.
	 */
	private handleDragStart(
		state: CanvasControllerState,
		_event: CanvasEvent,
		_anchorType: TransformAnchorType,
	): CanvasControllerState {
		return {
			...state,
			edgeScrollEnabled: true,
			objectMenuOpenId: null,
		};
	}

	/**
	 * Handles dragging on a transform-control anchor.
	 */
	private handleDrag(
		state: CanvasControllerState,
		event: CanvasEvent,
		anchorType: TransformAnchorType,
	): CanvasControllerState {
		// Rotation is handled separately
		if (anchorType === "rotation") {
			return handleRotationDrag(state, event);
		}

		// Common preprocessing for resize handling
		const eventStartSnapshot = state.eventStartSnapshot;
		if (!eventStartSnapshot) {
			return state;
		}

		// Determine the target frame (multiSelectGroup for multi-selection, the selected object for single selection)
		let startFrame: (TransformedFrame & TransformState) | null = null;
		let selectedId: string | null = null;
		const isMultiSelect = state.selectedIds.length > 1;

		if (isMultiSelect) {
			// For multi-selection, use multiSelectGroup
			const multiSelectGroup = eventStartSnapshot.multiSelectGroup;
			if (
				multiSelectGroup &&
				isTransformedFrame(multiSelectGroup) &&
				isTransformState(multiSelectGroup)
			) {
				startFrame = multiSelectGroup as TransformedFrame & TransformState;
			}
		} else if (state.selectedIds.length === 1) {
			// For single selection
			selectedId = state.selectedIds[0];
			const startObject = eventStartSnapshot.objects[selectedId];
			if (
				startObject &&
				isTransformedFrame(startObject) &&
				isTransformState(startObject)
			) {
				startFrame = startObject as TransformedFrame & TransformState;
			}
		}

		if (!startFrame) {
			return state;
		}

		// Compute the inverse affine-transformed cursor position (in the object's local space)
		const radians = degreesToRadians(startFrame.rotation);

		// Get from keyPoints, or compute if absent
		const startFrameKeyPointsId = isMultiSelect
			? eventStartSnapshot.multiSelectGroup?.id
			: selectedId;
		const startFrameKeyPoints: FrameKeyPoints =
			(startFrameKeyPointsId &&
				eventStartSnapshot.keyPoints[startFrameKeyPointsId]) ||
			calcFrameKeyPoints(startFrame);

		const aspectRatio =
			startFrame.height !== 0 && startFrame.width !== 0
				? startFrame.width / startFrame.height
				: undefined;
		const lockAspectRatio = startFrame.lockAspectRatio ?? false;
		const doKeepProportion =
			(lockAspectRatio || event.mods.shift) && aspectRatio !== undefined;

		// Anchor-specific resize calculation
		let resizeResult = calcAnchorResize(
			anchorType,
			startFrame,
			event.last.x,
			event.last.y,
			startFrameKeyPoints,
			radians,
			aspectRatio,
			doKeepProportion,
		);

		if (!resizeResult) {
			return state;
		}

		// Snap correction
		let snapFeedback: SnapFeedback = { x: [], y: [] };

		if (!event.mods.ctrl) {
			// Snap candidates use the cached set of all objects from dragStart by reference only;
			// exclusions (selection + all descendants) are passed to findSnap as a Set and filtered internally.
			const snapped = applyResizeSnap({
				anchorType,
				startFrame,
				cursorX: event.last.x,
				cursorY: event.last.y,
				startFrameKeyPoints,
				radians,
				aspectRatio,
				doKeepProportion,
				resizeResult,
				snapCandidates: eventStartSnapshot.snapCandidates,
				excludeIds: eventStartSnapshot.selectedIdsWithDescendants,
				zoom: state.viewport.zoom,
			});
			resizeResult = snapped.resizeResult;
			snapFeedback = snapped.snapFeedback;
		}

		const {
			width: newWidth,
			height: newHeight,
			inversedCenterX,
			inversedCenterY,
			scaleX: newScaleX,
			scaleY: newScaleY,
		} = resizeResult;

		// Transform the new center into world space
		const newCenter = calcAffineTransformedPoint(
			inversedCenterX,
			inversedCenterY,
			1,
			1,
			radians,
			startFrame.cx,
			startFrame.cy,
		);

		// Update the object/group with the new dimensions and center
		const updatedFrame = {
			...startFrame,
			width: roundToDecimal(Math.abs(newWidth), PRECISION.SIZE),
			height: roundToDecimal(Math.abs(newHeight), PRECISION.SIZE),
			cx: roundToDecimal(newCenter.x, PRECISION.COORDINATE),
			cy: roundToDecimal(newCenter.y, PRECISION.COORDINATE),
			scaleX: newScaleX,
			scaleY: newScaleY,
		};

		// Build the updated object map from eventStartSnapshot
		const updatedObjects = {
			...eventStartSnapshot.objects,
		};

		let nextState: CanvasControllerState;

		if (isMultiSelect) {
			// Multi-selection: transform each selected object relative to multiSelectGroup
			const startGroup = startFrame as GroupState;
			const updatedGroup: GroupState = {
				...startGroup,
				...updatedFrame,
			};

			const groupChildrenUpdates = transformChildren(
				startGroup,
				updatedGroup,
				startGroup,
				eventStartSnapshot.objects,
			);
			Object.assign(updatedObjects, groupChildrenUpdates);

			// Update multiSelectGroup as well
			nextState = {
				...state,
				objects: updatedObjects,
				multiSelectGroup: updatedGroup,
				snapFeedback,
			};

			// Recompute the bounding box of multiSelectGroup (only this is updated during drag)
			const recalculatedBounds = calcMultiSelectGroupBounds(
				state.selectedIds,
				nextState.objects,
				nextState.multiSelectGroup,
			);
			if (recalculatedBounds && nextState.multiSelectGroup) {
				nextState = {
					...nextState,
					multiSelectGroup: {
						...nextState.multiSelectGroup,
						...recalculatedBounds,
					},
				};
			}
		} else {
			// Single selection: update the selected object itself
			if (!selectedId) {
				return state;
			}

			const startObject = eventStartSnapshot.objects[selectedId];
			if (!startObject) {
				return state;
			}

			const updatedObject = {
				...startObject,
				...updatedFrame,
			};
			updatedObjects[selectedId] = updatedObject;

			// If it is a group, also transform the child objects
			if (updatedObject.type === "group") {
				const groupChildrenUpdates = transformChildren(
					startObject as GroupState,
					updatedObject as GroupState,
					updatedObject as GroupState,
					eventStartSnapshot.objects,
				);
				Object.assign(updatedObjects, groupChildrenUpdates);
			}

			nextState = {
				...state,
				objects: updatedObjects,
				snapFeedback,
			};

			// Only for a single group selection, update that group's own bounds (during drag).
			// Parent group updates happen on dragEnd.
			if (updatedObject.type === "group") {
				return updateSingleGroupBounds(nextState, selectedId);
			}
		}

		return nextState;
	}

	/**
	 * Handles drag end on a transform-control anchor.
	 */
	private handleDragEnd(
		state: CanvasControllerState,
		event: CanvasEvent,
		anchorType: TransformAnchorType,
	): CanvasControllerState {
		// Apply the drag-time state update to compute the final state.
		// handleDrag never mutates its argument, so the state can be passed as is.
		let nextState = this.handleDrag(state, event, anchorType);

		// On dragEnd, update the bounds of the selected objects and their parent groups
		for (const selectedId of nextState.selectedIds) {
			const obj = nextState.objects[selectedId];
			if (obj && (obj.type === "group" || obj.parentId)) {
				nextState = updateGroupBoundsFromRoot(nextState, selectedId);
			}
		}

		return {
			...nextState,
			edgeScrollEnabled: false, // Disable edge scrolling on drag end
		};
	}
}
