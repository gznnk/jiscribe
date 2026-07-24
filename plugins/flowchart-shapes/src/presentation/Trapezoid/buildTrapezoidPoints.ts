import {
	formatPolygonPoints,
	centeredPolygonOutline,
} from "@workspace/canvas/unstable";
import type { Point } from "@workspace/geometry";

import { TRAPEZOID_SLOPE_RATIO } from "../../schema/trapezoid/TrapezoidDoc";

/**
 * Trapezoid outline vertices (wide top, narrow bottom) for a bounding box whose
 * top-left corner is at (x, y). Single source shared by the renderer, the
 * draw-drag preview, and the connector outline calculator.
 */
export const trapezoidOutlinePoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => {
	const inset = width * TRAPEZOID_SLOPE_RATIO;
	return [
		{ x, y },
		{ x: x + width, y },
		{ x: x + width - inset, y: y + height },
		{ x: x + inset, y: y + height },
	];
};

export const buildTrapezoidPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => formatPolygonPoints(trapezoidOutlinePoints(x, y, width, height));

export const trapezoidOutline = centeredPolygonOutline(trapezoidOutlinePoints);
