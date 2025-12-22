import type { Diagram } from "../../../types/state/core/Diagram";
import { isItemableState } from "../../validation/isItemableState";
import { isTransformativeState } from "../../validation/isTransformativeState";

/**
 * Check if there are any items with rotateEnabled: false in the hierarchy
 * @param items - Array of diagram items to check
 * @returns True if any item has rotateEnabled: false, false otherwise
 */
export const hasRotateDisabledItem = (items: Diagram[]): boolean => {
	for (const item of items) {
		// Check if this item has rotation disabled
		if (isTransformativeState(item) && !item.rotateEnabled) {
			return true;
		}

		// Recursively check child items
		if (isItemableState(item) && item.items) {
			if (hasRotateDisabledItem(item.items)) {
				return true;
			}
		}
	}

	return false;
};