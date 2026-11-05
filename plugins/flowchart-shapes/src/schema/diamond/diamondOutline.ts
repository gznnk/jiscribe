import { centeredPolygonOutline } from "@jiscribe/canvas-sdk/doc";
import type { Point } from "@jiscribe/geometry";

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

export const diamondOutline = centeredPolygonOutline(diamondOutlinePoints);
