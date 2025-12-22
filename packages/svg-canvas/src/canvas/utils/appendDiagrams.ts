import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../../utils/validation/isItemableState";

/**
 * Appends diagrams to a target frame's items array, handling nested items recursively.
 *
 * @param diagrams - Array of diagrams to process
 * @param targetFrameId - ID of the target frame to append diagrams to
 * @param diagramsToAppend - Array of diagrams to append
 * @returns New array with diagrams appended to the target frame
 */
export const appendDiagrams = (
	diagrams: Diagram[],
	targetFrameId: string,
	diagramsToAppend: Diagram[]
): Diagram[] => {
	let isChanged = false;
	const newItems = diagrams.map((item) => {
		// If this is the target frame, append the diagrams to its items
		if (item.id === targetFrameId && isItemableState(item)) {
			isChanged = true;
			return {
				...item,
				items: [...(item.items || []), ...diagramsToAppend],
			};
		}

		// If this item has children, recursively process them
		if (isItemableState(item) && item.items) {
			const updatedItems = appendDiagrams(item.items, targetFrameId, diagramsToAppend);
			if (updatedItems !== item.items) {
				isChanged = true;
				return {
					...item,
					items: updatedItems,
				};
			}
		}

		return item;
	});

	// Return original array if no changes to help React optimization
	return isChanged ? newItems : diagrams;
};