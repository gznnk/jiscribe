import type { Diagram } from "../../../types/state/core/Diagram";
import { isItemableState } from "../../validation/isItemableState";
import { isSelectableState } from "../../validation/isSelectableState";

/**
 * Recursively retrieves selected shapes within a group, including shapes in nested groups
 *
 * @param {Diagram[]} diagrams - List of diagrams
 * @returns {string | undefined} - Selected shape within the group
 */
export const getSelectedChildDiagram = (
	diagrams: Diagram[],
): Diagram | undefined => {
	for (const diagram of diagrams) {
		if (isSelectableState(diagram) && diagram.isSelected) {
			return diagram;
		}
		if (isItemableState(diagram)) {
			const ret = getSelectedChildDiagram(diagram.items || []);
			if (ret) {
				return ret;
			}
		}
	}
	return undefined;
};
