import type {
	DiagramPath,
	DiagramPathIndex,
} from "../../types/core/DiagramPath";
import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../../utils/validation/isItemableState";

/**
 * Updates a diagram at a specific path (immutably) in a single traversal.
 * @param items - Root level diagrams
 * @param path - Path to the diagram
 * @param updateFn - Function to update the diagram
 * @returns Updated diagrams array, or original if path not found
 */
const updateDiagramAtPath = (
	items: Diagram[],
	path: DiagramPath,
	updateFn: (diagram: Diagram, path: DiagramPath) => Diagram,
): Diagram[] => {
	if (path.length === 0) return items;

	// Build array of parent diagrams that need to be updated along the path
	const parentDiagrams: Diagram[] = [];
	// Current level of diagrams being traversed (starts at root, goes deeper)
	let currentLevel: Diagram[] = items;

	// Navigate to the target diagram's level, collecting parent diagrams along the way
	for (let i = 0; i < path.length - 1; i++) {
		const idx = path[i];
		if (idx >= currentLevel.length) return items;

		const diagram = currentLevel[idx];
		parentDiagrams.push(diagram);

		if (!isItemableState(diagram)) return items;
		// Move to the next level (children of current diagram)
		currentLevel = diagram.items;
	}

	// Get and update the target diagram at the final level
	const lastIdx = path[path.length - 1];
	if (lastIdx >= currentLevel.length) return items;

	const targetDiagram = currentLevel[lastIdx];
	const updatedDiagram = updateFn(targetDiagram, path);

	// Start from the deepest level (where target diagram is) and work our way up
	let result: Diagram[] = currentLevel.map((item, i) =>
		i === lastIdx ? updatedDiagram : item,
	);

	// Work backwards up the path, updating each parent diagram
	for (let i = parentDiagrams.length - 1; i >= 0; i--) {
		const parentDiagram = parentDiagrams[i];
		const pathIdx = path[i];

		if (!isItemableState(parentDiagram)) return items;

		// Create updated parent with new children
		const updatedParent = {
			...parentDiagram,
			items: result,
		} as Diagram;

		// Get the level containing this parent (its siblings) and update it
		let parentSiblingLevel: Diagram[];
		if (i === 0) {
			// This is a top-level diagram, its siblings are in the root items array
			parentSiblingLevel = items;
		} else {
			// This diagram is nested, get its siblings from its grandparent
			const grandparent = parentDiagrams[i - 1];
			if (!isItemableState(grandparent)) return items;
			parentSiblingLevel = grandparent.items;
		}

		result = parentSiblingLevel.map((item, idx) =>
			idx === pathIdx ? updatedParent : item,
		);
	}

	return result;
};

/**
 * Updates diagrams at specific paths using an update function.
 * This uses direct path access to avoid traversing the entire tree.
 * @param items - Root level diagrams
 * @param pathIndex - Map of diagram IDs to their paths
 * @param updateFn - Function to update a diagram
 * @returns Updated diagrams array
 */
export const updateDiagramsByPath = (
	items: Diagram[],
	pathIndex: DiagramPathIndex,
	updateFn: (diagram: Diagram, path: DiagramPath) => Diagram,
): Diagram[] => {
	if (pathIndex.size === 0) return items;

	let result = items;

	// Process each path and update the diagram at that path
	pathIndex.forEach((path) => {
		result = updateDiagramAtPath(result, path, updateFn);
	});

	return result;
};
