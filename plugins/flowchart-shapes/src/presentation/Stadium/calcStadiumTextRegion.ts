import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";

/**
 * Insets by a full cap radius (half the short side) on the capped axis so the
 * region aligns with the flat edges between the semicircular caps. The caps
 * sit on the long axis: left/right when wide, top/bottom when tall.
 */
export const calcStadiumTextRegion: ObjectTextRegionCalculator<Dimensions> = ({
	width,
	height,
}) => {
	const capRadius = Math.min(width, height) / 2;
	if (width >= height) {
		return {
			x: -width / 2 + capRadius,
			y: -height / 2,
			width: width - capRadius * 2,
			height,
		};
	}
	return {
		x: -width / 2,
		y: -height / 2 + capRadius,
		width,
		height: height - capRadius * 2,
	};
};
