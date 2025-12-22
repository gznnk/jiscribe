import type {
	DiagramPath,
	DiagramPathIndex,
} from "../../types/core/DiagramPath";
import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../../utils/validation/isItemableState";

/**
 * Creates an index mapping diagram IDs to their paths in the tree.
 * Only creates paths for diagrams whose IDs are in the targetIds set.
 * @param items - Root level diagrams
 * @param targetIds - Set of diagram IDs to create paths for
 * @returns Map of diagram ID to path
 */
export const createDiagramPathIndex = (
	items: Diagram[],
	targetIds: Set<string>,
): DiagramPathIndex => {
	const index: DiagramPathIndex = new Map();

	const traverse = (diagrams: Diagram[], currentPath: DiagramPath) => {
		diagrams.forEach((diagram, idx) => {
			const path = [...currentPath, idx];

			// If this diagram is in the target set, add to index
			if (targetIds.has(diagram.id)) {
				index.set(diagram.id, path);
			}

			// Continue traversing children
			if (isItemableState(diagram)) {
				traverse(diagram.items, path);
			}
		});
	};

	traverse(items, []);

	return index;
};
