import { HEXAGON_CAP_RATIO } from "../../../../schemas/objects/primitives/hexagon/HexagonDoc";

/**
 * Builds the polygon point list for a hexagon whose bounding box has its
 * top-left corner at (x, y), with pointed caps on the left and right.
 * Shared by the object renderer (centered origin) and the draw-drag preview.
 */
export const buildHexagonPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => {
	const cap = width * HEXAGON_CAP_RATIO;
	const middleY = y + height / 2;
	return [
		`${x},${middleY}`,
		`${x + cap},${y}`,
		`${x + width - cap},${y}`,
		`${x + width},${middleY}`,
		`${x + width - cap},${y + height}`,
		`${x + cap},${y + height}`,
	].join(" ");
};
