import { isArray, isObject } from "@workspace/basic-validators";

import type { ItemableState } from "../../types/state/core/ItemableState";

/**
 * Check if an object is ItemableState.
 *
 * @param obj - The object to check
 * @returns True if the object is ItemableState, false otherwise
 */
export const isItemableState = (obj: unknown): obj is ItemableState => {
	if (!isObject(obj)) return false;

	return "itemableType" in obj && "items" in obj && isArray(obj.items);
};
