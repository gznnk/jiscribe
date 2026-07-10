import { negativeToZero } from "../common/negativeToZero";
import type { Frame } from "../types/Frame";
import type { RatioInsets } from "../types/RatioInsets";
import type { Rect } from "../types/Rect";

/**
 * Calculates the rectangle obtained by shrinking a frame with ratio insets.
 * Because the insets are ratios, the resulting rect follows the frame size.
 * Insets whose sum exceeds 1 collapse the rect to zero width / height.
 *
 * @param frame - The frame geometry (center based)
 * @param insets - Ratio insets for each edge (omitted edges mean 0)
 * @returns The inset rectangle (top-left based)
 */
export const calcInsetRect = (frame: Frame, insets: RatioInsets): Rect => {
	const { cx, cy, width, height } = frame;
	const { top = 0, right = 0, bottom = 0, left = 0 } = insets;
	return {
		x: cx - width / 2 + width * left,
		y: cy - height / 2 + height * top,
		width: negativeToZero(width - width * left - width * right),
		height: negativeToZero(height - height * top - height * bottom),
	};
};
