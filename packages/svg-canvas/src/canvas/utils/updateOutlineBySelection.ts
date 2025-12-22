import { applyFunctionRecursively } from "./applyFunctionRecursively";
import type { Diagram } from "../../types/state/core/Diagram";
import { isSelectableState } from "../../utils/validation/isSelectableState";

/**
 * Adds outline display to items based on their selection state and ancestor selection state.
 * This utility is used to ensure that items and their ancestors show outlines when selected.
 *
 * - If an item is selected, or any ancestor is selected, showOutline will be true.
 * - Also sets isAncestorSelected for each item for downstream logic.
 *
 * @param items - Array of Diagram items to process
 * @returns Diagram[] with updated showOutline and isAncestorSelected properties
 */
export const updateOutlineBySelection = (items: Diagram[]): Diagram[] => {
	return applyFunctionRecursively(items, (item, ancestors) => {
		// Only process selectable items
		if (!isSelectableState(item)) {
			return item;
		}
		// Determine if any ancestor is selected
		const isAncestorSelected = ancestors.some(
			(ancestor) => isSelectableState(ancestor) && ancestor.isSelected,
		);
		// Outline should be shown if the item or any ancestor is selected
		const shouldShowOutline = item.isSelected || isAncestorSelected;
		return {
			...item,
			isAncestorSelected,
			showOutline: shouldShowOutline,
		};
	});
};
