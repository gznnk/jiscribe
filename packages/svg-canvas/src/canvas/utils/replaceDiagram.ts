import { applyFunctionRecursively } from "./applyFunctionRecursively";
import type { Diagram } from "../../types/state/core/Diagram";

/**
 * Recursively replaces a diagram with the same ID in the items array.
 * Searches through all nested items to find and replace the target diagram.
 *
 * @param items - Array of diagrams to process
 * @param targetDiagram - The diagram to replace (matched by ID)
 * @returns Updated diagrams array with the target diagram replaced
 */
export const replaceDiagram = (
	items: Diagram[],
	targetDiagram: Diagram,
): Diagram[] => {
	return applyFunctionRecursively(items, (item) => {
		if (item.id === targetDiagram.id) {
			return targetDiagram;
		}
		return item;
	});
};
