import { applyFunctionRecursively } from "./applyFunctionRecursively";
import type { Diagram } from "../../types/state/core/Diagram";
import { getSelectedDiagrams } from "../../utils/core/getSelectedDiagrams";
import { isSelectableState } from "../../utils/validation/isSelectableState";

/**
 * Updates the isRootSelected property for all selected items.
 *
 * Note: getSelectedDiagrams() already returns only root selected items
 * (items with isSelected=true that don't have a selected ancestor),
 * so we can directly use its result to mark root selected items.
 *
 * @param items - The list of items to process
 * @returns The updated list of items with isRootSelected properly set
 */
export const updateRootSelectedState = (items: Diagram[]): Diagram[] => {
	// Get all root selected items (getSelectedDiagrams returns only root level selected items)
	const rootSelectedItems = getSelectedDiagrams(items);

	// Create a set of root selected item IDs for quick lookup
	const rootSelectedIds = new Set(rootSelectedItems.map((item) => item.id));

	// Update items with isRootSelected property
	return applyFunctionRecursively(items, (item) => {
		if (!isSelectableState(item)) {
			return item;
		}

		const isRootSelected = rootSelectedIds.has(item.id);

		return {
			...item,
			isRootSelected,
		};
	});
};
