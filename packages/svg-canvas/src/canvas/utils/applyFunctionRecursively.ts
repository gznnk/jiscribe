import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../../utils/validation/isItemableState";

/**
 * Apply a function recursively to a list of items.
 *
 * @param items - The list of items to apply the function to.
 * @param updateFunction - The function to apply to each item.
 * @param ancestors - The list of ancestor items for the current recursion level.
 * @returns {Diagram[]} - The updated list of items.
 */
export const applyFunctionRecursively = (
	items: Diagram[],
	updateFunction: (item: Diagram, ancestors: Diagram[]) => Diagram,
	ancestors: Diagram[] = [],
): Diagram[] => {
	let isItemChanged = false;
	const newItems: Diagram[] = [];
	for (const item of items) {
		const newItem = updateFunction(item, ancestors);
		newItems.push(newItem);

		// Determine if the reference of the item has changed
		if (item !== newItem) {
			// If the item reference has changed, mark it as changed.
			isItemChanged = true;
		}
		if (isItemableState(item) && isItemableState(newItem)) {
			const newGroupItems = applyFunctionRecursively(
				item.items ?? [],
				updateFunction,
				[...ancestors, newItem],
			);
			// If the reference of the array has changed, mark it as modified.
			if (newGroupItems !== item.items) {
				newItem.items = newGroupItems;
				isItemChanged = true;
			}
		}
	}

	// If there are no changes, return the original array reference so React detects no modifications.
	return isItemChanged ? newItems : items;
};
