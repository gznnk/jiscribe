import { updateOutlineOfItemable } from "./updateOutlineOfItemable";
import type { Diagram } from "../../types/state/core/Diagram";

/**
 * Update the outline of all itemable diagrams in the list.
 * Note: ConnectLine types are excluded from outline updates as they have different boundary calculation logic.
 *
 * @param items - The list of diagrams to update.
 * @returns {Diagram[]} - The updated list of diagrams with the outline of all itemables updated.
 */
export const updateOutlineOfAllItemables = (items: Diagram[]): Diagram[] => {
	return items.map((item) => updateOutlineOfItemable(item));
};
