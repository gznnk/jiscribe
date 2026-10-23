import { calcFrameKeyPoints, isTransformedFrame } from "@jiscribe/geometry";
import type { TransformedFrame } from "@jiscribe/geometry";

import type { CanvasControllerState } from "../../../../CanvasTypes";

/** The five numbers the layout section states about the selection's frame. */
export type SelectedFrameValues = {
	/** World x of the frame's top-left corner, as the transform handles show it. */
	x: number;
	/** World y of the frame's top-left corner. */
	y: number;
	width: number;
	height: number;
	/** Degrees, measured about the frame's center. */
	rotation: number;
};

/** The frame getSelectedFrameValues reads; null for a selection that carries none. */
const getSelectedFrame = (
	state: CanvasControllerState,
): TransformedFrame | null => {
	const { objectIds } = state.selection;
	if (objectIds.length === 0) {
		return null;
	}
	const frame =
		objectIds.length > 1 ? state.multiSelectGroup : state.objects[objectIds[0]];
	return frame && isTransformedFrame(frame) ? frame : null;
};

/**
 * The frame the layout rows show: the selected object's, or the multiSelectGroup's
 * for a multi-selection — the same one the transform handles are drawn around, and
 * the same one TRANSFORM_PROPERTY_UPDATE writes back to.
 *
 * @param state - The current canvas controller state; only the selection and the objects it names are read
 * @returns The frame's numbers, or null for a selection that carries no frame: nothing, a connector (its shape is its vertices), or an object whose type has no frame
 */
export const getSelectedFrameValues = (
	state: CanvasControllerState,
): SelectedFrameValues | null => {
	const frame = getSelectedFrame(state);
	if (frame === null) {
		return null;
	}
	const topLeft = calcFrameKeyPoints(frame).topLeft;
	return {
		x: topLeft.x,
		y: topLeft.y,
		width: frame.width,
		height: frame.height,
		rotation: frame.rotation,
	};
};
