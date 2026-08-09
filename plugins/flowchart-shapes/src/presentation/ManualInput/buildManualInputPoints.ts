import {
	formatPolygonPoints,
	centeredPolygonOutline,
} from "@jiscribe/canvas-sdk";
import type { Point } from "@jiscribe/geometry";

import { MANUAL_INPUT_SLOPE_RATIO } from "../../schema/manualInput/ManualInputDoc";

/**
 * Manual-input outline vertices (top edge sloping up toward the right) for a
 * bounding box whose top-left corner is at (x, y). Single source shared by the
 * renderer, the draw-drag preview, and the connector outline calculator.
 */
export const manualInputOutlinePoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => {
	const slope = height * MANUAL_INPUT_SLOPE_RATIO;
	return [
		{ x, y: y + slope },
		{ x: x + width, y },
		{ x: x + width, y: y + height },
		{ x, y: y + height },
	];
};

export const buildManualInputPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => formatPolygonPoints(manualInputOutlinePoints(x, y, width, height));

export const manualInputOutline = centeredPolygonOutline(
	manualInputOutlinePoints,
);
