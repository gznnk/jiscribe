import { isBoolean, isNonNegativeNumber } from "@workspace/basic-validators";

import { isTransformativeData } from "./isTransformativeData";
import type { TransformativeState } from "../../types/state/core/TransformativeState";

/**
 * Check if an object is TransformativeState.
 *
 * @param obj - The object to check
 * @returns True if the object is TransformativeState, false otherwise
 */
export const isTransformativeState = (
	obj: unknown,
): obj is TransformativeState => {
	if (!isTransformativeData(obj)) {
		return false;
	}
	if (!("isTransforming" in obj) || !isBoolean(obj.isTransforming)) {
		return false;
	}
	if (
		"minWidth" in obj &&
		obj.minWidth !== undefined &&
		!isNonNegativeNumber(obj.minWidth)
	) {
		return false;
	}
	if (
		"minHeight" in obj &&
		obj.minHeight !== undefined &&
		!isNonNegativeNumber(obj.minHeight)
	) {
		return false;
	}
	if (
		"hideTransformControl" in obj &&
		obj.hideTransformControl !== undefined &&
		!isBoolean(obj.hideTransformControl)
	) {
		return false;
	}
	if (
		"transformEnabled" in obj &&
		obj.transformEnabled !== undefined &&
		!isBoolean(obj.transformEnabled)
	) {
		return false;
	}

	return true;
};
