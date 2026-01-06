import type { Frame } from "../types/Frame";
import type { Rect } from "../types/Rect";

/**
 * Converts a Rect (top-left based) to a Frame (center based).
 *
 * @param rect - The rectangle geometry
 * @returns The corresponding Frame
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
