import {
	isNonNegativeNumber,
	isNumber,
	isObject,
} from "@workspace/basic-validators";

import type { Rect } from "../types/Rect";

/**
 * Check if an object is a Rect.
 * Validates all required Rect properties:
 * - Position: x, y (numbers)
 * - Size: width, height (non-negative numbers)
 * - Transform: rotation, scaleX, scaleY (numbers)
 *
 * @param obj - The object to check
 * @returns True if the object is a Rect, false otherwise
 */
export const isRect = (obj: unknown): obj is Rect => {
	if (!isObject(obj)) return false;

	return (
		"x" in obj &&
		isNumber(obj.x) &&
		"y" in obj &&
		isNumber(obj.y) &&
		"width" in obj &&
		isNonNegativeNumber(obj.width) &&
		"height" in obj &&
		isNonNegativeNumber(obj.height) &&
		"rotation" in obj &&
		isNumber(obj.rotation) &&
		"scaleX" in obj &&
		isNumber(obj.scaleX) &&
		"scaleY" in obj &&
		isNumber(obj.scaleY)
	);
};
