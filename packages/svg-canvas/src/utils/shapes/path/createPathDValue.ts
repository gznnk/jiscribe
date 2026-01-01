import { createBezierDValue } from "./createBezierDValue";
import { createDValue } from "./createDValue";
import { createRoundedDValue } from "./createRoundedDValue";
import { createStraightDValue } from "./createStraightDValue";
import type { PathType } from "../../../types/core/PathType";
import type { PathPointState } from "../../../types/state/shapes/PathPointState";

/**
 * Creates a path data value (d attribute) from an array of path points based on PathType.
 *
 * @param points - Array of path points to create path from
 * @param pathType - Type of path to generate (Straight, Polyline, Curve, or Rounded)
 * @param startTrim - Amount to trim from the start of the path (default: 0)
 * @param endTrim - Amount to trim from the end of the path (default: 0)
 * @param radius - Corner radius for Rounded paths (default: 10)
 * @returns SVG path d attribute value
 */
export const createPathDValue = (
	points: PathPointState[],
	pathType: PathType,
	startTrim = 0,
	endTrim = 0,
	radius: number = 10,
): string => {
	switch (pathType) {
		case "Straight":
			return createStraightDValue(points, startTrim, endTrim);
		case "Polyline":
			return createDValue(points, startTrim, endTrim);
		case "Curve":
			return createBezierDValue(points, startTrim, endTrim);
		case "Rounded":
			return createRoundedDValue(points, radius, startTrim, endTrim);
		default:
			return createDValue(points, startTrim, endTrim);
	}
};
