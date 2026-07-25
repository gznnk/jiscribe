import { isNumber, isObject } from "@workspace/basic-validators";

import type { Point } from "../types/Point";

/** Type guard for {@link Point}. */
export const isPoint = (value: unknown): value is Point => {
	if (!isObject(value)) {
		return false;
	}

	return "x" in value && isNumber(value.x) && "y" in value && isNumber(value.y);
};
