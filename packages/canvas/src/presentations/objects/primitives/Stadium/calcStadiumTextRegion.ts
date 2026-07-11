import type { Dimensions, Rect } from "@workspace/geometry";

/**
 * Insets the region by half the cap depth on both sides. The caps are
 * semicircles of radius half the short side, so the inset follows the short
 * side rather than the width.
 */
export const calcStadiumTextRegion = ({ width, height }: Dimensions): Rect => {
	const capInset = Math.min(width, height) / 4;
	return {
		x: -width / 2 + capInset,
		y: -height / 2,
		width: width - capInset * 2,
		height,
	};
};
