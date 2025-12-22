import type { DiagramType } from "../../types/core/DiagramType";
import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../validation/isItemableState";

/**
 * Recursively retrieves all diagrams of a specific type from a collection of diagrams.
 * This function traverses nested groups and other container diagrams to find all matching diagrams.
 *
 * @param diagrams - Array of diagrams to search through
 * @param targetType - The specific diagram type to search for
 * @returns Array of diagrams matching the specified type
 */
export const getDiagramsByType = (
	diagrams: Diagram[],
	targetType: DiagramType,
): Diagram[] => {
	const results: Diagram[] = [];

	for (const diagram of diagrams) {
		// Check if current diagram matches the target type
		if (diagram.type === targetType) {
			results.push(diagram);
		}

		// Recursively search in nested items if the diagram is itemable
		if (isItemableState(diagram)) {
			const nestedResults = getDiagramsByType(diagram.items, targetType);
			results.push(...nestedResults);
		}
	}

	return results;
};
