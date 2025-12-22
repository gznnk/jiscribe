import { replaceDiagram } from "./replaceDiagram";
import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../../utils/validation/isItemableState";

/**
 * Adds a diagram to either a parent canvas's items or to the root level.
 * If parentCanvas is provided and is an itemable, the diagram is added to its items.
 * Otherwise, the diagram is added to the root level of the items array.
 *
 * @param items - The current array of diagrams
 * @param diagram - The diagram to add
 * @param parentCanvas - Optional parent canvas to add the diagram to
 * @returns Updated array of diagrams with the new diagram added
 */
export const addDiagramToParentOrRoot = (
	items: Diagram[],
	diagram: Diagram,
	parentCanvas?: Diagram,
): Diagram[] => {
	if (parentCanvas && isItemableState(parentCanvas)) {
		// Add diagram to the parent canvas's items
		const updatedParent: typeof parentCanvas = {
			...parentCanvas,
			items: [...parentCanvas.items, diagram],
		};
		return replaceDiagram(items, updatedParent);
	} else {
		// No parent canvas found, add to root level
		return [...items, diagram];
	}
};
