import type { Point } from "@jiscribe/geometry";

import {
	calcUmlPackageTabHeight,
	UML_PACKAGE_TAB_WIDTH_RATIO,
} from "../schema/UmlPackageDoc";

/**
 * Corners of the package silhouette for a bounding box whose top-left corner is
 * at (x, y): the tab occupies the top-left, and the body fills everything below
 * it. Shared by the renderer (centered origin) and the outline, so the drawn shape
 * and the one connectors attach to cannot drift apart.
 *
 * @param x - Left edge in local coordinates; the tab starts here too
 * @param y - Top edge in local coordinates, i.e. the tab's top rather than the body's
 * @param width - Box width; the tab takes UML_PACKAGE_TAB_WIDTH_RATIO of it
 * @param height - Box height, tab included
 * @returns Six corners, clockwise from the tab's top-left
 */
export const calcUmlPackagePoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => {
	const tabHeight = calcUmlPackageTabHeight(height);
	const tabWidth = width * UML_PACKAGE_TAB_WIDTH_RATIO;
	return [
		{ x, y },
		{ x: x + tabWidth, y },
		{ x: x + tabWidth, y: y + tabHeight },
		{ x: x + width, y: y + tabHeight },
		{ x: x + width, y: y + height },
		{ x, y: y + height },
	];
};
