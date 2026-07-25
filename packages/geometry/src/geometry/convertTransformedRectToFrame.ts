import type { TransformedFrame } from "../types/TransformedFrame";
import type { TransformedRect } from "../types/TransformedRect";

/**
 * Converts a {@link TransformedRect} (top-left based) to a {@link TransformedFrame} (center based).
 *
 * @param rect - The rect to convert; its rotation and flips carry over
 *   unchanged, and `x` / `y` are its top-left corner before rotation
 */
export const convertTransformedRectToFrame = (
	rect: TransformedRect,
): TransformedFrame => {
	const { x, y, width, height, rotation, scaleX, scaleY } = rect;
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
