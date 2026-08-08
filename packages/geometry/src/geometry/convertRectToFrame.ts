import type { Frame } from "../types/Frame";
import type { Rect } from "../types/Rect";

/**
 * Converts a {@link Rect} (top-left based) to a {@link Frame} (center based).
 *
 * @param rect - The rect to convert; `x` / `y` are its top-left corner, not
 *   its center
 */
export const convertRectToFrame = (rect: Rect): Frame => {
	const { x, y, width, height } = rect;
	return {
		cx: x + width / 2,
		cy: y + height / 2,
		width,
		height,
	};
};
