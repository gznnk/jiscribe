import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../../utils/validation/isItemableState";
import { isSelectableState } from "../../utils/validation/isSelectableState";

/**
 * Removes all selected diagrams from the given array, handling nested items recursively.
 *
 * @param diagrams - Array of diagrams to process
 * @returns New array with selected diagrams removed
 */
export const removeSelectedDiagrams = (diagrams: Diagram[]): Diagram[] => {
	const result = [];

	for (const diagram of diagrams) {
		if (isSelectableState(diagram) && diagram.isSelected) {
			// Don't include this diagram in the result (delete it)
			continue;
		}

		if (isItemableState(diagram) && 0 < diagram.items.length) {
			// If diagram is not selected but has children, process children recursively
			const processedChildItems = removeSelectedDiagrams(diagram.items);
			result.push({
				...diagram,
				items: processedChildItems,
			});
		} else {
			// Diagram is not selected and has no children, keep it as is
			result.push(diagram);
		}
	}

	return result;
};
