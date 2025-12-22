import { createDiagramPathIndex } from "./createDiagramPathIndex";
import type { DiagramPathIndex } from "../../types/core/DiagramPath";
import type { Diagram } from "../../types/state/core/Diagram";
import { getSelectedDiagrams } from "../../utils/core/getSelectedDiagrams";

/**
 * Creates a DiagramPathIndex for all selected diagrams in the given items array.
 * This is a convenience function that combines getSelectedDiagrams and createDiagramPathIndex.
 *
 * @param items - Array of diagram items to search for selected diagrams
 * @returns A DiagramPathIndex map containing paths to all selected diagrams
 *
 * @example
 * ```typescript
 * const items = [...]; // your diagram items
 * const pathIndex = createSelectedDiagramPathIndex(items);
 * // pathIndex now contains paths to all selected diagrams
 * ```
 */
export const createSelectedDiagramPathIndex = (
	items: Diagram[],
): DiagramPathIndex => {
	const selectedItems = getSelectedDiagrams(items);
	const selectedIds = new Set(selectedItems.map((item) => item.id));
	return createDiagramPathIndex(items, selectedIds);
};
