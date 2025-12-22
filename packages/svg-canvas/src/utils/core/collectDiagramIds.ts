import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../validation/isItemableState";

/**
 * Recursively collects all diagram IDs from an array of diagrams, including nested items.
 *
 * @param diagrams - Array of diagrams to process
 * @returns Set of all diagram IDs found recursively
 */
export const collectDiagramIds = (diagrams: Diagram[]): Set<string> => {
	const result = new Set<string>();

	for (const diagram of diagrams) {
		// Add current diagram's ID
		result.add(diagram.id);

		// If diagram has items, recursively collect their IDs
		if (isItemableState(diagram) && diagram.items.length > 0) {
			const childIds = collectDiagramIds(diagram.items);
			childIds.forEach((id) => result.add(id));
		}
	}

	return result;
};
