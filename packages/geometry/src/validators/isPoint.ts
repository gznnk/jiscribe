import { isNumber, isObject } from "@jiscribe/basic-validators";

import type { Point } from "../types/Point";

/**
 * Type guard for {@link Point}.
 *
 * @param value - Value to narrow; extra properties are allowed, so any object
 *   carrying numeric `x` / `y` passes
 */
export const isPoint = (value: unknown): value is Point => {
	if (!isObject(value)) {
		return false;
	}

	return "x" in value && isNumber(value.x) && "y" in value && isNumber(value.y);
};
