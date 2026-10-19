import { isTransform } from "@jiscribe/geometry";

import { DEFAULT_LOCK_ASPECT_RATIO } from "../../../../../../states/objects/base/TransformState";
import type {
	ResizedAxes,
	ResizeHeldEdge,
} from "../../../../../../states/registry/ObjectContentResizerRegistry";
import type {
	CanvasControllerState,
	TransformDragResize,
} from "../../../../../CanvasTypes";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import type { TransformAnchorType } from "../TransformAnchorType";
import { RESIZE_ANCHOR_GEOMETRIES } from "./calcAnchorResize";

/**
 * What a resize has to say about itself before it starts: only the modifier that
 * locks the aspect ratio for this one resize. Narrower than the whole event so a
 * resize that comes from a typed size rather than a drag can state it too.
 */
export type ResizeIntent = Pick<CanvasEvent, "mods">;

/**
 * The edge an axis holds while the anchor pushes it one way (`direction`, as in
 * RESIZE_ANCHOR_GEOMETRIES): the far one, or the middle for an axis the anchor
 * does not push, which only a kept proportion resizes.
 */
const calcHeldEdge = (direction: -1 | 0 | 1): ResizeHeldEdge => {
	if (direction === -1) {
		return "end";
	}
	return direction === 1 ? "start" : "center";
};

/** Whether the selection resizes both axes together whatever anchor is dragged. */
const keepsProportion = (
	state: CanvasControllerState,
	event: ResizeIntent,
): boolean => {
	if (event.mods.shift) {
		return true;
	}
	if (state.multiSelectGroup) {
		return state.multiSelectGroup.lockAspectRatio ?? DEFAULT_LOCK_ASPECT_RATIO;
	}
	// Past the group, the selection holds the one object the frame is drawn
	// around: a resize of several always has their multiSelectGroup.
	return state.selection.objectIds.some((id) => {
		const object = state.objects[id];
		return (
			object !== undefined &&
			"lockAspectRatio" in object &&
			object.lockAspectRatio === true
		);
	});
};

/**
 * Which axes a resize about to start through a transform handle writes, and the
 * edge each holds: the left and right handles the width alone, the top and bottom
 * the height alone, the corners both, each from the edge or corner opposite the
 * handle. Shift or a locked aspect ratio makes any handle write both, a side
 * handle growing the other axis about its middle (calcAnchorResize).
 *
 * @param state - The state the resize starts from, read for the selection's locked aspect ratio (the multi-select group's, else any selected object's)
 * @param event - The dragStart, read only for Shift, which makes any handle write both axes for this drag alone
 * @param anchorType - The handle being dragged
 * @returns null for `"rotation"`, which writes no extent; otherwise the axes in the dragged frame's own terms, flips included
 */
export const calcResizedAxes = (
	state: CanvasControllerState,
	event: ResizeIntent,
	anchorType: TransformAnchorType,
): ResizedAxes | null => {
	const geometry = RESIZE_ANCHOR_GEOMETRIES[anchorType];
	if (!geometry) {
		return null;
	}
	const keepsBoth = keepsProportion(state, event);
	return {
		...((geometry.dx !== 0 || keepsBoth) && {
			width: calcHeldEdge(geometry.dx),
		}),
		...((geometry.dy !== 0 || keepsBoth) && {
			height: calcHeldEdge(geometry.dy),
		}),
	};
};

/**
 * The resize about to start, stated in the frame the handle belongs to: the
 * multi-select group for several objects, else the one selected.
 *
 * @param state - The state the resize starts from; its selection names the frame
 * @param event - The dragStart, read only for Shift (calcResizedAxes)
 * @param anchorType - The handle being dragged
 * @returns null for `"rotation"`, and for a selection with no transformed frame to resize
 */
export const calcTransformDragResize = (
	state: CanvasControllerState,
	event: ResizeIntent,
	anchorType: TransformAnchorType,
): TransformDragResize | null => {
	const axes = calcResizedAxes(state, event, anchorType);
	const frame =
		state.selection.objectIds.length > 1
			? state.multiSelectGroup
			: state.objects[state.selection.objectIds[0]];
	if (axes === null || !isTransform(frame)) {
		return null;
	}
	return {
		axes,
		frame: {
			rotation: frame.rotation,
			scaleX: frame.scaleX,
			scaleY: frame.scaleY,
		},
	};
};
