import {
	isNonNegativeNumber,
	isNumber,
	isObject,
} from "@workspace/basic-validators";

import type { Frame } from "../types/Frame";

/**
 * Check if an object is a Frame.
 * Validates all required Frame properties:
 * - Position: cx, cy (numbers)
 * - Size: width, height (non-negative numbers)
 * - Transform: rotation, scaleX, scaleY (numbers)
 *
 * @param obj - The object to check
 * @returns True if the object is a Frame, false otherwise
 */
export const isFrame = (obj: unknown): obj is Frame => {
	if (!isObject(obj)) return false;

	return (
		"cx" in obj &&
		isNumber(obj.cx) &&
		"cy" in obj &&
		isNumber(obj.cy) &&
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
