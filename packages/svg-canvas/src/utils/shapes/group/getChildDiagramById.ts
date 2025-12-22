import type { Diagram } from "../../../types/state/core/Diagram";
import { isItemableState } from "../../validation/isItemableState";

/**
 * Recursively retrieves a shape with the specified ID, including shapes in nested groups
 *
 * @param diagrams - List of diagrams
 * @param id - ID
 * @returns Shape with the specified ID
 */
export const getChildDiagramById = (
	diagrams: Diagram[],
	id: string,
): Diagram | undefined => {
	for (const diagram of diagrams) {
		if (diagram.id === id) {
			return diagram;
		}
		if (isItemableState(diagram)) {
			const ret = getChildDiagramById(diagram.items || [], id);
			if (ret) {
				return ret;
			}
		}
	}
	return undefined;
};
