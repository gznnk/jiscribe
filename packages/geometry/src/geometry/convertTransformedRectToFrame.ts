import type { TransformedFrame } from "../types/TransformedFrame";
import type { TransformedRect } from "../types/TransformedRect";

/**
 * Converts a TransformedRect (top-left based) to a TransformedFrame (center based).
 *
 * @param geometry - The transformed rectangle geometry
 * @returns The corresponding TransformedFrame
 */
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
