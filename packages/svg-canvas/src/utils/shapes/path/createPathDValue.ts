import { createBezierDValue } from "./createBezierDValue";
import { createDValue } from "./createDValue";
import { createRoundedDValue } from "./createRoundedDValue";
import { createStraightDValue } from "./createStraightDValue";
import type { PathType } from "../../../types/core/PathType";
import type { Diagram } from "../../../types/state/core/Diagram";

/**
 * Creates a path data value (d attribute) from an array of diagram items based on PathType.
 *
 * @param items - Array of diagram items to create path from
 * @param pathType - Type of path to generate (Straight, Polyline, Curve, or Rounded)
 * @param startTrim - Amount to trim from the start of the path (default: 0)
 * @param endTrim - Amount to trim from the end of the path (default: 0)
 * @param radius - Corner radius for Rounded paths (default: 10)
 * @returns SVG path d attribute value
 */
export const createPathDValue = (
	items: Diagram[],
	pathType: PathType,
	startTrim = 0,
	endTrim = 0,
	radius: number = 10,
): string => {
	switch (pathType) {
		case "Straight":
			return createStraightDValue(items, startTrim, endTrim);
		case "Polyline":
			return createDValue(items, startTrim, endTrim);
		case "Curve":
			return createBezierDValue(items, startTrim, endTrim);
		case "Rounded":
			return createRoundedDValue(items, radius, startTrim, endTrim);
		default:
			return createDValue(items, startTrim, endTrim);
	}
};
