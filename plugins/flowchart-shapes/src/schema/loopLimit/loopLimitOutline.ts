import { centeredPolygonOutline } from "@jiscribe/canvas-sdk/doc";
import type { Point } from "@jiscribe/geometry";

import { LOOP_LIMIT_CUT_RATIO } from "./LoopLimitDoc";

/**
 * Loop-limit outline vertices (both top corners cut off) for a bounding box
 * whose top-left corner is at (x, y). The cut length follows the shorter side
 * so the corners stay 45-degree bevels at any aspect ratio. Single source
 * shared by the renderer, the draw-drag preview, and the connector outline
 * provider.
 */
export const loopLimitOutlinePoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => {
	const cut = Math.min(width, height) * LOOP_LIMIT_CUT_RATIO;
	return [
		{ x: x + cut, y },
		{ x: x + width - cut, y },
		{ x: x + width, y: y + cut },
		{ x: x + width, y: y + height },
		{ x, y: y + height },
		{ x, y: y + cut },
	];
};

export const loopLimitOutline = centeredPolygonOutline(loopLimitOutlinePoints);
