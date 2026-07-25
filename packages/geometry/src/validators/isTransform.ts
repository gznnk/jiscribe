import { isNumber, isObject } from "@workspace/basic-validators";

import { isFlipScale } from "./isFlipScale";
import type { Transform } from "../types/Transform";

/**
 * Type guard for {@link Transform}. `scaleX` / `scaleY` must be flip flags (1 or -1).
 *
 * @param value - Value to narrow; only the transform fields are checked, so any
 *   transformed shape passes
 */
export const isTransform = (value: unknown): value is Transform => {
	if (!isObject(value)) {
		return false;
	}

	return (
		"rotation" in value &&
		isNumber(value.rotation) &&
		"scaleX" in value &&
		isFlipScale(value.scaleX) &&
		"scaleY" in value &&
		isFlipScale(value.scaleY)
	);
};
