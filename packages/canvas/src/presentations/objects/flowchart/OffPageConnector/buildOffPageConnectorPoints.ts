import { OFF_PAGE_CONNECTOR_TIP_RATIO } from "../../../../schemas/objects/flowchart/offPageConnector/OffPageConnectorDoc";

/**
 * Builds the polygon point list for a home-plate pentagon whose bounding box
 * has its top-left corner at (x, y): a rectangle whose bottom edge tapers to a
 * downward point at the horizontal center. Shared by the object renderer
 * (centered origin) and the draw-drag preview.
 */
export const buildOffPageConnectorPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => {
	const shoulderY = y + height * (1 - OFF_PAGE_CONNECTOR_TIP_RATIO);
	return [
		`${x},${y}`,
		`${x + width},${y}`,
		`${x + width},${shoulderY}`,
		`${x + width / 2},${y + height}`,
		`${x},${shoulderY}`,
	].join(" ");
};
