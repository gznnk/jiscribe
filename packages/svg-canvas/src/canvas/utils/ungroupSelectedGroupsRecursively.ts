import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../../utils/validation/isItemableState";
import { isSelectableState } from "../../utils/validation/isSelectableState";

/**
 * Ungroup selected groups.
 *
 * @param items - List of all existing diagrams.
 * @returns Updated list of diagrams.
 */
export const ungroupSelectedGroupsRecursively = (items: Diagram[]) => {
	// Recursively ungroup selected groups and rebuild the item list.
	const ungroupedItems: Diagram[] = [];

	for (const item of items) {
		if (
			item.type === "Group" &&
			isItemableState(item) &&
			isSelectableState(item)
		) {
			if (item.isSelected) {
				for (const groupItem of item.items) {
					ungroupedItems.push(groupItem);
				}
			} else {
				const updatedGroup = {
					...item,
					items: ungroupSelectedGroupsRecursively(item.items),
				} as Diagram;
				ungroupedItems.push(updatedGroup);
			}
		} else {
			ungroupedItems.push(item);
		}
	}

	// Remove empty groups.
	const cleanedItems = ungroupedItems.filter((item) => {
		if (
			item.type === "Group" &&
			isItemableState(item) &&
			item.items.length === 0
		) {
			return false;
		}
		return true;
	});

	return cleanedItems;
};
