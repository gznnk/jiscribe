import type { Frame } from "../types/Frame";
import type { Rect } from "../types/Rect";

/**
 * Converts a Frame (center based) to a Rect (top-left based).
 *
 * @param frame - The frame geometry
 * @returns The corresponding Rect
 */
export const convertFrameToRect = (frame: Frame): Rect => {
	const { cx, cy, width, height } = frame;
	return {
		x: cx - width / 2,
		y: cy - height / 2,
		width,
		height,
	};
};
