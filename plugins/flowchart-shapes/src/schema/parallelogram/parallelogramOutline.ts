import { centeredPolygonOutline } from "@jiscribe/canvas-sdk/doc";
import type { Point } from "@jiscribe/geometry";

import { PARALLELOGRAM_SKEW_RATIO } from "./ParallelogramDoc";

/**
 * Parallelogram outline vertices for a bounding box whose top-left corner is at
 * (x, y). The top edge is shifted right by the skew. Single source shared by the
 * renderer, the draw-drag preview, and the connector outline calculator.
 */
export const parallelogramOutlinePoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => {
	const skew = width * PARALLELOGRAM_SKEW_RATIO;
	return [
		{ x: x + skew, y },
		{ x: x + width, y },
		{ x: x + width - skew, y: y + height },
		{ x, y: y + height },
	];
};

export const parallelogramOutline = centeredPolygonOutline(
	parallelogramOutlinePoints,
);
