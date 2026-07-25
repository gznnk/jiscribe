import type { TransformedFrame } from "../types/TransformedFrame";
import type { TransformedRect } from "../types/TransformedRect";

/** Converts a {@link TransformedRect} (top-left based) to a {@link TransformedFrame} (center based). */
export const convertTransformedRectToFrame = (
	geometry: TransformedRect,
): TransformedFrame => {
	const { x, y, width, height, rotation, scaleX, scaleY } = geometry;
	return {
		cx: x + width / 2,
		cy: y + height / 2,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	};
};
