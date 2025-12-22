import type { DiagramPath } from "../../types/core/DiagramPath";
import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../../utils/validation/isItemableState";

/**
 * Gets a diagram by its path in the tree structure.
 * @param items - Root level diagrams
 * @param path - Path to the diagram (e.g., [0, 2, 1] means items[0].items[2].items[1])
 * @returns The diagram at the specified path, or undefined if not found
 */
export const getDiagramByPath = (
	items: Diagram[],
	path: DiagramPath,
): Diagram | undefined => {
	let current: Diagram[] = items;

	for (let i = 0; i < path.length; i++) {
		const index = path[i];

		if (index < 0 || index >= current.length) {
			return undefined;
		}

		const diagram = current[index];

		// If this is the last index in the path, return the diagram
		if (i === path.length - 1) {
			return diagram;
		}

		// Otherwise, continue traversing
		if (!isItemableState(diagram)) {
			return undefined;
		}

		current = diagram.items;
	}

	return undefined;
};
