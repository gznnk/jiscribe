import {
	formatPolygonPoints,
	centeredPolygonOutline,
} from "@workspace/canvas/unstable";
import type { Point } from "@workspace/geometry";

/**
 * Diamond outline vertices (top / right / bottom / left) for a bounding box
 * whose top-left corner is at (x, y). Single source shared by the renderer, the
 * draw-drag preview, and the connector outline calculator.
 */
export const diamondOutlinePoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => [
	{ x: x + width / 2, y },
	{ x: x + width, y: y + height / 2 },
	{ x: x + width / 2, y: y + height },
	{ x, y: y + height / 2 },
];

export const buildDiamondPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => formatPolygonPoints(diamondOutlinePoints(x, y, width, height));

export const diamondOutline = centeredPolygonOutline(diamondOutlinePoints);
