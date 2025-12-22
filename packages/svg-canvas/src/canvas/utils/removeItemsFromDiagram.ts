import { removeDiagramsById } from "./removeDiagramsById";
import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../../utils/validation/isItemableState";

/**
 * Removes diagrams with specified IDs from a diagram's items array.
 * Returns a new diagram with the items removed.
 * If the diagram is not an itemable, returns the diagram unchanged.
 *
 * @param diagram - The diagram to remove items from
 * @param idsToRemove - Array of IDs to remove
 * @returns New diagram with specified items removed
 */
export const removeItemsFromDiagram = (
	diagram: Diagram,
	idsToRemove: string[],
): Diagram => {
	if (!isItemableState(diagram)) {
		return diagram;
	}

	return {
		...diagram,
		items: removeDiagramsById(diagram.items, idsToRemove),
	} as Diagram;
};
