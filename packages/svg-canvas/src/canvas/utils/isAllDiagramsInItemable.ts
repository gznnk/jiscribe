import type { Diagram } from "../../types/state/core/Diagram";
import type { ItemableState } from "../../types/state/core/ItemableState";
import { isItemableState } from "../../utils/validation/isItemableState";

/**
 * Checks if all specified diagrams are contained within the given itemable.
 * Recursively searches through itemable items to verify all diagrams are present.
 *
 * @param itemable - The itemable to search within
 * @param diagrams - Array of diagrams to check for
 * @returns true if all diagrams are in the itemable, false otherwise
 */
export const isAllDiagramsInItemable = (
	itemable: ItemableState,
	diagrams: Diagram[],
): boolean => {
	// Collect all diagram IDs within this itemable (recursively)
	const collectAllIds = (items: Diagram[]): Set<string> => {
		const ids = new Set<string>();
		for (const item of items) {
			ids.add(item.id);
			if (isItemableState(item)) {
				const childIds = collectAllIds(item.items);
				childIds.forEach((id) => ids.add(id));
			}
		}
		return ids;
	};

	const allIdsInItemable = collectAllIds(itemable.items);

	// Check if all specified diagrams are in this itemable
	return diagrams.every((diagram) => allIdsInItemable.has(diagram.id));
};
