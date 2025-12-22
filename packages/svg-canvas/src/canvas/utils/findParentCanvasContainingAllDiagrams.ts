import { isAllDiagramsInItemable } from "./isAllDiagramsInItemable";
import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../../utils/validation/isItemableState";

/**
 * Finds the parent Canvas (with itemableType === "canvas") that contains all specified diagrams.
 * Searches breadth-first to find the highest-level canvas that contains all diagrams.
 *
 * @param allDiagrams - Array of all diagrams on the canvas
 * @param targetDiagrams - Array of diagrams to find a common parent for
 * @returns The canvas containing all target diagrams, or undefined if not found
 */
export const findParentCanvasContainingAllDiagrams = (
	allDiagrams: Diagram[],
	targetDiagrams: Diagram[],
): Diagram | undefined => {
	// First, check all diagrams at the current level for canvas itemables
	for (const diagram of allDiagrams) {
		if (
			isItemableState(diagram) &&
			diagram.itemableType === "canvas" &&
			isAllDiagramsInItemable(diagram, targetDiagrams)
		) {
			// Found a canvas itemable at this level that contains all target diagrams
			return diagram;
		}
	}

	// If not found at current level, recursively search child itemables
	for (const diagram of allDiagrams) {
		if (isItemableState(diagram)) {
			const result = findParentCanvasContainingAllDiagrams(
				diagram.items,
				targetDiagrams,
			);
			if (result) {
				return result;
			}
		}
	}

	// No itemable found that contains all target diagrams
	return undefined;
};
