import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

/**
 * Insets the right by the cap radius (height / 2) so the full-height region
 * ends where the straight top/bottom edges meet the semicircular cap. A
 * constant ratio overflows the right corners once height exceeds 0.4 * width.
 */
export const calcDelayTextRegion: ObjectTextRegionCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ right: height / (2 * width) },
	);
