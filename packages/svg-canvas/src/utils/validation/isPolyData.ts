import { isArray, isObject } from "@workspace/basic-validators";

import type { PolyData } from "../../types/data/core/PolyData";

/**
 * Check if an object is PolyData.
 *
 * @param obj - The object to check
 * @returns True if the object is PolyData, false otherwise
 */
export const isPolyData = (obj: unknown): obj is PolyData => {
	if (!isObject(obj)) {
		return false;
	}

	return "points" in obj && isArray(obj.points);
};
