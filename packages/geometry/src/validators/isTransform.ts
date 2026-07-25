import { isNumber, isObject } from "@workspace/basic-validators";

import { isFlipScale } from "./isFlipScale";
import type { Transform } from "../types/Transform";

/** Type guard for {@link Transform}. `scaleX` / `scaleY` must be flip flags (1 or -1). */
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
