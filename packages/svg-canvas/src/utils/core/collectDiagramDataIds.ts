import type { DiagramData } from "../../types/data/core/DiagramData";
import { isItemableData } from "../validation/isItemableData";

/**
 * Recursively collects all diagram IDs from an array of diagram data, including nested items.
 *
 * @param diagrams - Array of diagram data to process
 * @returns Set of all diagram IDs found recursively
 */
export const collectDiagramDataIds = (diagrams: DiagramData[]): Set<string> => {
	const result = new Set<string>();

	for (const diagram of diagrams) {
		// Add current diagram's ID
		result.add(diagram.id);

		// If diagram has items, recursively collect their IDs
		if (isItemableData(diagram) && diagram.items.length > 0) {
			const childIds = collectDiagramDataIds(diagram.items);
			childIds.forEach((id) => result.add(id));
		}
	}

	return result;
};