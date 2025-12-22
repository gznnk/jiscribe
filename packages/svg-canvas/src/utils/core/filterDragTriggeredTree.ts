import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../validation/isItemableState";

/**
 * Recursively filter items to keep only those in the drag-triggered tree.
 * Returns a new array containing only items where `isInDragTriggeredTree` is true,
 * preserving the tree structure.
 *
 * @param items - Array of diagram items to filter
 * @returns Filtered array containing only items in the drag-triggered tree, or empty array if none found
 */
export const filterDragTriggeredTree = (items: Diagram[]): Diagram[] => {
	const filtered: Diagram[] = [];

	for (const item of items) {
		// If this item is in the ancestor path, include it
		if (item.isInDragTriggeredTree) {
			// Check if this item has nested items (Group or CanvasFrame)
			if (isItemableState(item) && item.itemableType !== "composite") {
				// Recursively filter child items
				const filteredChildren = filterDragTriggeredTree(item.items);
				if (filteredChildren.length > 0) {
					filtered.push({
						...item,
						items: filteredChildren,
					} as Diagram);
				}
			} else {
				// Leaf node in the ancestor path
				filtered.push(item);
			}
		}
	}

	return filtered;
};
