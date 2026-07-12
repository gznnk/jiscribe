import { PARALLELOGRAM_SKEW_RATIO } from "../../../../schemas/objects/flowchart/parallelogram/ParallelogramDoc";

/**
 * Builds the polygon point list for a parallelogram whose bounding box has its
 * top-left corner at (x, y). The top edge is shifted right by the skew.
 * Shared by the object renderer (centered origin) and the draw-drag preview.
 */
export const buildParallelogramPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => {
	const skew = width * PARALLELOGRAM_SKEW_RATIO;
	return [
		`${x + skew},${y}`,
		`${x + width},${y}`,
		`${x + width - skew},${y + height}`,
		`${x},${y + height}`,
	].join(" ");
};
