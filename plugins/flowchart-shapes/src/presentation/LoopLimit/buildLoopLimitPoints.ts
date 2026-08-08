import {
	formatPolygonPoints,
	centeredPolygonOutline,
} from "@workspace/canvas-sdk";
import type { Point } from "@workspace/geometry";

import { LOOP_LIMIT_CUT_RATIO } from "../../schema/loopLimit/LoopLimitDoc";

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

export const buildLoopLimitPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => formatPolygonPoints(loopLimitOutlinePoints(x, y, width, height));

export const loopLimitOutline = centeredPolygonOutline(loopLimitOutlinePoints);
