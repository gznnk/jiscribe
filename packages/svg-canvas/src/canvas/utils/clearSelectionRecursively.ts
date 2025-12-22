import { applyFunctionRecursively } from "./applyFunctionRecursively";
import type { Diagram } from "../../types/state/core/Diagram";
import { isSelectableState } from "../../utils/validation/isSelectableState";
import { isTransformativeState } from "../../utils/validation/isTransformativeState";

/**
 * Recursively clear the selection state of all items.
 *
 * @param items - The list of items to process.
 * @returns {Diagram[]} - The updated list of items with the selection state cleared.
 */
export const clearSelectionRecursively = (items: Diagram[]): Diagram[] => {
	return applyFunctionRecursively(items, (item) => {
		if (isSelectableState(item) && isTransformativeState(item)) {
			return {
				...item,
				isSelected: false,
				isRootSelected: false,
				isAncestorSelected: false,
				showOutline: false,
			};
		}

		if (isSelectableState(item)) {
			return {
				...item,
				isSelected: false,
				isRootSelected: false,
				isAncestorSelected: false,
				showOutline: false,
			};
		}

		return item;
	});
};
