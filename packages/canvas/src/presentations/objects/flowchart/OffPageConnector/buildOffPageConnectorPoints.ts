import type { Point } from "@workspace/geometry";

import { OFF_PAGE_CONNECTOR_TIP_RATIO } from "../../../../schemas/objects/flowchart/offPageConnector/OffPageConnectorDoc";
import { formatPolygonPoints } from "../../utils/formatPolygonPoints";
import { centeredPolygonOutline } from "../../utils/outlineHelpers";

/**
 * Home-plate pentagon outline vertices for a bounding box whose top-left corner
 * is at (x, y): a rectangle whose bottom edge tapers to a downward point at the
 * horizontal center. Single source shared by the renderer, the draw-drag
 * preview, and the connector outline provider.
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
