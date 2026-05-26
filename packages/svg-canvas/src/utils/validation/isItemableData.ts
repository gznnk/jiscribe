import { isArray, isObject } from "@workspace/basic-validators";

import type { ItemableData } from "../../types/data/core/ItemableData";

/**
 * Check if an object is ItemableData.
 *
 * @param obj - The object to check
 * @returns True if the object is ItemableData, false otherwise
 */
export const isItemableData = (obj: unknown): obj is ItemableData => {
	if (!isObject(obj)) {
		return false;
	}

	return "items" in obj && isArray(obj.items);
};
