import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../validation/isItemableState";

/**
 * Get the diagram by ID from the list of diagrams.
 *
 * @param {Diagram[]} diagrams - The list of diagrams to search.
 * @param {string} id - The ID of the diagram to find.
 * @returns {Diagram | undefined} - The diagram with the specified ID, or undefined if not found.
 */
export const getDiagramById = (
	diagrams: Diagram[],
	id: string,
): Diagram | undefined => {
	for (const diagram of diagrams) {
		if (diagram.id === id) {
			return diagram;
		}
		// Recursively search if the diagram has items.
		if (isItemableState(diagram)) {
			const ret = getDiagramById(diagram.items || [], id);
			if (ret) {
				return ret;
			}
		}
	}
	return undefined;
};
