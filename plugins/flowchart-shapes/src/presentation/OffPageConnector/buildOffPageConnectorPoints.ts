import {
	formatPolygonPoints,
	centeredPolygonOutline,
} from "@jiscribe/canvas-sdk";
import type { Point } from "@jiscribe/geometry";

import { OFF_PAGE_CONNECTOR_TIP_RATIO } from "../../schema/offPageConnector/OffPageConnectorDoc";

/**
 * Home-plate pentagon outline vertices for a bounding box whose top-left corner
 * is at (x, y): a rectangle whose bottom edge tapers to a downward point at the
 * horizontal center. Single source shared by the renderer, the draw-drag
 * preview, and the connector outline calculator.
 */
export const offPageConnectorOutlinePoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => {
	const shoulderY = y + height * (1 - OFF_PAGE_CONNECTOR_TIP_RATIO);
	return [
		{ x, y },
		{ x: x + width, y },
		{ x: x + width, y: shoulderY },
		{ x: x + width / 2, y: y + height },
		{ x, y: shoulderY },
	];
};

export const buildOffPageConnectorPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string =>
	formatPolygonPoints(offPageConnectorOutlinePoints(x, y, width, height));

export const offPageConnectorOutline = centeredPolygonOutline(
	offPageConnectorOutlinePoints,
);
