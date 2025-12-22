import type { Diagram } from "../../../../types/state/core/Diagram";
import { isItemableState } from "../../../../utils/validation/isItemableState";
import { isTextableState } from "../../../../utils/validation/isTextableState";

/**
 * Recursively searches through diagram items to find the item currently in text editing mode.
 * Examines both direct items and nested items within containers.
 *
 * @param items - Array of diagram items to search through
 * @returns The diagram item in text editing mode or undefined if none found
 */
export const getTextEditingItem = (items: Diagram[]): Diagram | undefined => {
	for (const item of items) {
		if (isTextableState(item) && item.isTextEditing) {
			return item;
		}
		if (isItemableState(item)) {
			const childItem = getTextEditingItem(item.items);
			if (childItem) {
				return childItem;
			}
		}
	}
};
