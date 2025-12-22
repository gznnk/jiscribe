import type { Diagram } from "../../../../types/state/core/Diagram";
import { isItemableState } from "../../../../utils/validation/isItemableState";

/**
 * Get the first non-Group diagram from an array of diagrams.
 * If a Group is encountered, recursively searches its children.
 * This is useful for getting the actual diagram properties for menu display,
 * as Groups don't have the same properties as individual shapes.
 *
 * @param diagrams - Array of diagrams to search
 * @returns The first non-Group diagram found, or undefined if none exists
 *
 * @example
 * const diagrams = [groupDiagram, rectangleDiagram];
 * const firstNonGroup = getFirstNonGroupDiagram(diagrams);
 * // Returns the first non-Group diagram from the group's children or the rectangle
 */
export const getFirstNonGroupDiagram = (
	diagrams: Diagram[],
): Diagram | undefined => {
	for (const diagram of diagrams) {
		// If this diagram is not a Group, return it
		if (diagram.type !== "Group") {
			return diagram;
		}

		// If this is a Group with items, recursively search its children
		if (isItemableState(diagram) && diagram.items && diagram.items.length > 0) {
			const found = getFirstNonGroupDiagram(diagram.items);
			if (found) {
				return found;
			}
		}
	}

	// No non-Group diagram found
	return undefined;
};
