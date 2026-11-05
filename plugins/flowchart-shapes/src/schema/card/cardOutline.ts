import { centeredPolygonOutline } from "@jiscribe/canvas-sdk/doc";
import type { Point } from "@jiscribe/geometry";

import { CARD_CUT_RATIO } from "./CardDoc";

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

export const cardOutline = centeredPolygonOutline(cardOutlinePoints);
