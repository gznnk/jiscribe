import { centeredPolygonOutline } from "@jiscribe/canvas-sdk/doc";
import type { Point } from "@jiscribe/geometry";

import { HEXAGON_CAP_RATIO } from "./HexagonDoc";

/**
 * Hexagon outline vertices for a bounding box whose top-left corner is at (x, y),
 * with pointed caps on the left and right. Single source shared by the renderer,
 * the draw-drag preview, and the connector outline calculator.
 */
export const hexagonOutlinePoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => {
	const cap = width * HEXAGON_CAP_RATIO;
	const middleY = y + height / 2;
	return [
		{ x, y: middleY },
		{ x: x + cap, y },
		{ x: x + width - cap, y },
		{ x: x + width, y: middleY },
		{ x: x + width - cap, y: y + height },
		{ x: x + cap, y: y + height },
	];
};

export const hexagonOutline = centeredPolygonOutline(hexagonOutlinePoints);
