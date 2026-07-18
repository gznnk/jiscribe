import type { Point } from "@workspace/geometry";

import { formatPolygonPoints } from "../../utils/formatPolygonPoints";
import { centeredPolygonOutline } from "../../utils/outlineHelpers";

/**
 * Extract (upward-triangle) outline vertices (apex at top center, base along the
 * bottom) for a bounding box whose top-left corner is at (x, y). Single source
 * shared by the renderer, the draw-drag preview, and the connector outline provider.
 */
export const extractOutlinePoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => [
	{ x: x + width / 2, y },
	{ x: x + width, y: y + height },
	{ x, y: y + height },
];

export const buildExtractPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => formatPolygonPoints(extractOutlinePoints(x, y, width, height));

export const extractOutline = centeredPolygonOutline(extractOutlinePoints);
