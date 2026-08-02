import type { Point } from "@workspace/geometry";

import { PACKAGE_SHOULDER_RATIO } from "../../schema/package/PackageDoc";

/**
 * Corners of the isometric box silhouette for a bounding box whose top-left
 * corner is at (x, y): a hexagon with its apex at the top center and its tip at
 * the bottom center. Shared by the renderer (centered origin) and the outline,
 * so the drawn shape and the one connectors attach to cannot drift apart.
 *
 * @param x Left edge in local coordinates.
 * @param y Top edge in local coordinates.
 * @param width Box width.
 * @param height Box height.
 * @returns Six corners, clockwise from the top apex.
 */
export const calcPackagePoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => {
	const centerX = x + width / 2;
	const shoulderY = y + height * PACKAGE_SHOULDER_RATIO;
	const hipY = y + height * (1 - PACKAGE_SHOULDER_RATIO);
	return [
		{ x: centerX, y },
		{ x: x + width, y: shoulderY },
		{ x: x + width, y: hipY },
		{ x: centerX, y: y + height },
		{ x, y: hipY },
		{ x, y: shoulderY },
	];
};
