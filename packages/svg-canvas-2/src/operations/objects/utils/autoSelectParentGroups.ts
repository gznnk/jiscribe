import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { GroupState } from "../../../states/objects/primitives/GroupState";

/**
 * Recursively collects all descendant IDs of a group
 * @param state - The canvas state
 * @param groupId - The group ID to collect descendants from
 * @returns Set of all descendant IDs (children, grandchildren, etc.)
 */
function collectAllDescendants(
	state: CanvasState,
	groupId: string,
): Set<string> {
	const descendants = new Set<string>();
	const group = state.objects[groupId] as GroupState;
	if (!group || group.type !== "group") return descendants;

	for (const childId of group.childIds) {
		descendants.add(childId);
		const child = state.objects[childId];
		if (child?.type === "group") {
			// Recursively collect descendants of child groups
			const childDescendants = collectAllDescendants(state, childId);
			for (const descendantId of childDescendants) {
				descendants.add(descendantId);
			}
		}
	}

	return descendants;
}

/**
 * Automatically selects parent groups when all their children are selected,
 * and deselects the children. This process is applied recursively up the hierarchy.
 *
 * This implements the logic from svg-canvas (useOnSelect.ts lines 264-311) where
 * groups are automatically selected when all children become selected.
 *
 * @param state - The canvas state
 * @param selectedIds - The current selected IDs
 * @returns Updated selectedIds with parent groups auto-selected
 *
 * @example
 * // Before: children ['rect-1', 'rect-2', 'rect-3'] are selected
 * // After: parent 'group-1' is selected, children are deselected
 * autoSelectParentGroups(state, ['rect-1', 'rect-2', 'rect-3'])
 * // Returns: ['group-1']
 */
export function autoSelectParentGroups(
	state: CanvasState,
	selectedIds: string[],
): string[] {
	let currentSelectedIds = [...selectedIds];
	let changed = true;

	// Loop until no more changes occur (handles multi-level hierarchies)
	// Safety limit to prevent infinite loops in case of circular references
	const MAX_ITERATIONS = 100;
	let iterations = 0;

	while (changed && iterations < MAX_ITERATIONS) {
		changed = false;
		iterations++;
		const parentCandidates = new Set<string>();

		// Collect all parent groups of currently selected objects
		for (const id of currentSelectedIds) {
			const obj = state.objects[id];
			if (obj?.parentId) {
				parentCandidates.add(obj.parentId);
			}
		}

		// Check each parent: if all children are selected, select the parent instead
		for (const parentId of parentCandidates) {
			const parent = state.objects[parentId] as GroupState;
			if (!parent) continue;

			// Check if all children are in the current selection
			const allChildrenSelected =
				parent.childIds.length > 0 &&
				parent.childIds.every((childId) =>
					currentSelectedIds.includes(childId),
				);

			if (allChildrenSelected) {
				// Collect all descendants (children, grandchildren, etc.)
				const allDescendants = collectAllDescendants(state, parentId);

				// Remove all descendants from selection
				currentSelectedIds = currentSelectedIds.filter(
					(id) => !allDescendants.has(id),
				);

				// Add parent to selection (if not already there)
				if (!currentSelectedIds.includes(parentId)) {
					currentSelectedIds.push(parentId);
					changed = true;
				}
			}
		}
	}

	// TODO: そもそも、グループ階層の循環参照が発生していないかを検証するロジックをいれて、この処理は廃止すべき
	// Log warning if we hit the iteration limit (indicates potential data issue)
	if (iterations >= MAX_ITERATIONS) {
		console.warn(
			"[autoSelectParentGroups] Maximum iterations reached. Possible circular reference in group hierarchy.",
		);
	}

	return currentSelectedIds;
}
