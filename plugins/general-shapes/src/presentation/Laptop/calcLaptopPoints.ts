import type { Point } from "@workspace/geometry";

import {
	LAPTOP_SCREEN_HEIGHT_RATIO,
	LAPTOP_SCREEN_WIDTH_RATIO,
	LAPTOP_SCREEN_X_RATIO,
} from "../../schema/laptop/LaptopDoc";

/**
 * Corners of the laptop silhouette for a bounding box whose top-left corner is
 * at (x, y). The drawing is two pieces, but their union is a single closed
 * polygon: the base's top edge runs along exactly the same span as the screen's
 * bottom edge, so the two share that segment and it falls away. The screen's
 * small corner radius is not modelled here.
 *
 * @param x Left edge in local coordinates.
 * @param y Top edge in local coordinates; the screen starts here.
 * @param width Box width; only the base reaches its full extent.
 * @param height Box height, base included.
 * @returns Six corners, clockwise from the screen's top-left.
 */
export const calcLaptopPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => {
	const screenLeft = x + width * LAPTOP_SCREEN_X_RATIO;
	const screenRight = screenLeft + width * LAPTOP_SCREEN_WIDTH_RATIO;
	const screenBottom = y + height * LAPTOP_SCREEN_HEIGHT_RATIO;
	return [
		{ x: screenLeft, y },
		{ x: screenRight, y },
		{ x: screenRight, y: screenBottom },
		{ x: x + width, y: y + height },
		{ x, y: y + height },
		{ x: screenLeft, y: screenBottom },
	];
};
