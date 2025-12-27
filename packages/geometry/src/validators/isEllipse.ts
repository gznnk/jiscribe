import {
	isNonNegativeNumber,
	isNumber,
	isObject,
} from "@workspace/basic-validators";

import type { Ellipse } from "../types/Ellipse";

/**
 * Check if an object is an Ellipse.
 * Validates all required Ellipse properties:
 * - Position: cx, cy (numbers)
 * - Radii: rx, ry (non-negative numbers)
 * - Transform: rotation, scaleX, scaleY (numbers)
 *
 * @param obj - The object to check
 * @returns True if the object is an Ellipse, false otherwise
 */
export const isEllipse = (obj: unknown): obj is Ellipse => {
	if (!isObject(obj)) return false;

	return (
		"cx" in obj &&
		isNumber(obj.cx) &&
		"cy" in obj &&
		isNumber(obj.cy) &&
		"rx" in obj &&
		isNonNegativeNumber(obj.rx) &&
		"ry" in obj &&
		isNonNegativeNumber(obj.ry) &&
		"rotation" in obj &&
		isNumber(obj.rotation) &&
		"scaleX" in obj &&
		isNumber(obj.scaleX) &&
		"scaleY" in obj &&
		isNumber(obj.scaleY)
	);
};
