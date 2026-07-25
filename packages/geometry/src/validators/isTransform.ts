import { isNumber, isObject } from "@workspace/basic-validators";

import { isFlipScale } from "./isFlipScale";
import type { Transform } from "../types/Transform";

/**
 * Check if an object has Transform properties.
 * Validates transformation properties:
 * - rotation (number)
 * - scaleX (1 | -1: 反転フラグ)
 * - scaleY (1 | -1: 反転フラグ)
 *
 * @param obj - The object to check
 * @returns True if the object has Transform properties, false otherwise
 */
export const isTransform = (obj: unknown): obj is Transform => {
	if (!isObject(obj)) {
		return false;
	}

	return (
		"rotation" in obj &&
		isNumber(obj.rotation) &&
		"scaleX" in obj &&
		isFlipScale(obj.scaleX) &&
		"scaleY" in obj &&
		isFlipScale(obj.scaleY)
	);
};
