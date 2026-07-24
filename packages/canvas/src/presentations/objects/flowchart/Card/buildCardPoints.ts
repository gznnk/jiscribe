import type { Point } from "@workspace/geometry";

import { CARD_CUT_RATIO } from "../../../../schemas/objects/flowchart/card/CardDoc";
import { formatPolygonPoints } from "../../utils/formatPolygonPoints";
import { centeredPolygonOutline } from "../../utils/outlineHelpers";

/**
 * Card outline vertices (top-left corner cut off) for a bounding box whose
 * top-left corner is at (x, y). The cut length follows the shorter side so the
 * corner stays a 45-degree bevel at any aspect ratio. Single source shared by
 * the renderer, the draw-drag preview, and the connector outline calculator.
 */
export const cardOutlinePoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => {
	const cut = Math.min(width, height) * CARD_CUT_RATIO;
	return [
		{ x: x + cut, y },
		{ x: x + width, y },
		{ x: x + width, y: y + height },
		{ x, y: y + height },
		{ x, y: y + cut },
	];
};

export const buildCardPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => formatPolygonPoints(cardOutlinePoints(x, y, width, height));

export const cardOutline = centeredPolygonOutline(cardOutlinePoints);
