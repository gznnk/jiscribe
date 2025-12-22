import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../validation/isItemableState";
import { isSelectableState } from "../validation/isSelectableState";

/**
 * Get the selected diagrams from a list of diagrams.
 *
 * @param diagrams - The list of diagrams to search.
 * @param selectedDiagrams - The list populated with found selected diagrams.
 * @returns {Diagram[]} - The list of selected diagrams.
 */
export const getSelectedDiagrams = (
	diagrams: Diagram[],
	selectedDiagrams: Diagram[] = [],
) => {
	for (const item of diagrams) {
		if (isSelectableState(item)) {
			if (item.isSelected) {
				selectedDiagrams.push(item);
			} else if (isItemableState(item)) {
				getSelectedDiagrams(item.items, selectedDiagrams);
			}
		}
	}
	return selectedDiagrams;
};
