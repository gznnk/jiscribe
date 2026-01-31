import { isNumber, isObject } from "@workspace/basic-validators";

import type { CenterPoint } from "../types/CenterPoint";

/**
 * Type guard to check if a value is a valid CenterPoint object.
 * Validates that the value has cx and cy properties that are both numbers.
 */
export const isCenterPoint = (value: unknown): value is CenterPoint => {
	if (!isObject(value)) return false;

	return (
		"cx" in value && isNumber(value.cx) && "cy" in value && isNumber(value.cy)
	);
};
