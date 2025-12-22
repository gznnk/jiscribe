import type { Diagram } from "../../types/state/core/Diagram";
import { hasRotateDisabledItem } from "../../utils/shapes/group/hasRotateDisabledItem";
import { isItemableState } from "../../utils/validation/isItemableState";

/**
 * Recursively clean up groups by removing empty groups and ungrouping single-item groups.
 *
 * @param items - Array of diagram items to process
 * @returns Cleaned up array of diagram items
 */
export const cleanupGroups = (items: Diagram[]): Diagram[] => {
	const result: Diagram[] = [];

	for (const item of items) {
		if (isItemableState(item) && item.itemableType !== "composite") {
			// Recursively cleanup nested groups first
			const cleanedItems = cleanupGroups(item.items);

			// Handle group-specific cleanup
			if (item.itemableType === "group") {
				if (cleanedItems.length === 0) {
					// Remove empty groups
					continue;
				} else if (cleanedItems.length === 1) {
					// Ungroup single-item groups - add the single item directly
					result.push(cleanedItems[0]);
					continue;
				} else {
					// Keep groups with multiple items, but with cleaned up items
					// Update rotateEnabled based on child items only (not previous group state)
					const groupRotateEnabled = !hasRotateDisabledItem(cleanedItems);

					result.push({
						...item,
						items: cleanedItems,
						rotateEnabled: groupRotateEnabled,
					} as typeof item);
					continue;
				}
			}

			// For non-group itemables (like CanvasFrame), just update items without changing rotateEnabled
			result.push({
				...item,
				items: cleanedItems,
			} as typeof item);
		} else {
			result.push(item);
		}
	}

	return result;
};
