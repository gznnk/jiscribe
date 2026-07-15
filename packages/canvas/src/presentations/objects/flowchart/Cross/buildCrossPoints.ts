import type { Point } from "@workspace/geometry";

import { formatPolygonPoints } from "../../utils/formatPolygonPoints";
import { centeredPolygonOutline } from "../../utils/outlineHelpers";

/**
 * Cross (plus) outline vertices, with arms one third of the width/height, for a
 * bounding box whose top-left corner is at (x, y). Single source shared by the
 * renderer, the draw-drag preview, and the connector outline provider.
 */
export const crossOutlinePoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => {
	const w3 = width / 3;
	const h3 = height / 3;
	return [
		{ x: x + w3, y },
		{ x: x + 2 * w3, y },
		{ x: x + 2 * w3, y: y + h3 },
		{ x: x + width, y: y + h3 },
		{ x: x + width, y: y + 2 * h3 },
		{ x: x + 2 * w3, y: y + 2 * h3 },
		{ x: x + 2 * w3, y: y + height },
		{ x: x + w3, y: y + height },
		{ x: x + w3, y: y + 2 * h3 },
		{ x, y: y + 2 * h3 },
		{ x, y: y + h3 },
		{ x: x + w3, y: y + h3 },
	];
};

export const buildCrossPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => formatPolygonPoints(crossOutlinePoints(x, y, width, height));

export const crossOutline = centeredPolygonOutline(crossOutlinePoints);
