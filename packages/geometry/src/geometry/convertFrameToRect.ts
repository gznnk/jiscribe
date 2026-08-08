import type { Frame } from "../types/Frame";
import type { Rect } from "../types/Rect";

/**
 * Converts a {@link Frame} (center based) to a {@link Rect} (top-left based).
 *
 * @param frame - The frame to convert; any rotation it carries is dropped,
 *   since `Rect` is axis-aligned
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
