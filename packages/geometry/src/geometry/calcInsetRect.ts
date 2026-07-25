import { negativeToZero } from "../common/negativeToZero";
import type { Frame } from "../types/Frame";
import type { RatioInsets } from "../types/RatioInsets";
import type { Rect } from "../types/Rect";

/**
 * Shrinks a frame by ratio insets. Because the insets are ratios, the result
 * follows the frame size. Insets summing above 1 collapse the rect to zero
 * width or height.
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
