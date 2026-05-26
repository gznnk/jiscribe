import { isNumber, isObject } from "@workspace/basic-validators";

import type { Point } from "../types/Point";

/**
 * Type guard to check if a value is a valid Point object.
 * Validates that the value has x and y properties that are both numbers.
 */
export const isPoint = (value: unknown): value is Point => {
	if (!isObject(value)) {
		return false;
	}

	return "x" in value && isNumber(value.x) && "y" in value && isNumber(value.y);
};
