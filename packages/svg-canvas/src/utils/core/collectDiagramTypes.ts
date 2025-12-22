import type { DiagramType } from "../../types/core/DiagramType";
import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../validation/isItemableState";

/**
 * Internal recursive function to collect diagram types.
 *
 * @param diagrams - The list of diagrams to collect types from.
 * @param types - The set to populate with collected types.
 * @returns {Set<DiagramType>} - The set with collected types.
 */
const collectTypes = (
	diagrams: Diagram[],
	types: Set<DiagramType>,
): Set<DiagramType> => {
	for (const item of diagrams) {
		types.add(item.type);
		if (isItemableState(item) && item.itemableType !== "composite") {
			collectTypes(item.items, types);
		}
	}
	return types;
};

/**
 * Collect diagram types from diagrams and their children recursively.
 *
 * @param diagrams - The list of diagrams to collect types from.
 * @returns {Set<DiagramType>} - A set containing all diagram types found in diagrams and their descendants.
 */
export const collectDiagramTypes = (diagrams: Diagram[]): Set<DiagramType> => {
	return collectTypes(diagrams, new Set<DiagramType>());
};
