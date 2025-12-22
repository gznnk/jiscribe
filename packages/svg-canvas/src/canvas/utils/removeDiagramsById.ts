import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../../utils/validation/isItemableState";

/**
 * Removes diagrams with specified IDs from the given array, handling nested items recursively.
 *
 * @param diagrams - Array of diagrams to process
 * @param idsToRemove - Array of IDs to remove
 * @returns New array with specified diagrams removed
 */
export const removeDiagramsById = (
	diagrams: Diagram[],
	idsToRemove: string[],
): Diagram[] => {
	const result = [];

	for (const diagram of diagrams) {
		if (idsToRemove.includes(diagram.id)) {
			// Don't include this diagram in the result (delete it)
			continue;
		}

		if (isItemableState(diagram) && 0 < diagram.items.length) {
			// If diagram is not in removal list but has children, process children recursively
			const processedChildItems = removeDiagramsById(
				diagram.items,
				idsToRemove,
			);
			result.push({
				...diagram,
				items: processedChildItems,
			});
		} else {
			// Diagram is not in removal list and has no children, keep it as is
			result.push(diagram);
		}
	}

	return result;
};
