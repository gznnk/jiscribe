import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { GroupState } from "../../../states/objects/primitives/GroupState";

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
	let result = [...selectedIds];
	let changed = true;

	// Loop until no more changes occur (handles multi-level hierarchies)
	while (changed) {
		changed = false;
		const parentCandidates = new Set<string>();

		// Collect all parent groups of currently selected objects
		for (const id of result) {
			const obj = state.objects[id];
			if (obj?.parentId) {
				parentCandidates.add(obj.parentId);
			}
		}

		// Check each parent: if all children are selected, select the parent instead
		for (const parentId of parentCandidates) {
			const parent = state.objects[parentId] as GroupState;
			if (!parent) continue;

			// Check if all children are in the current result (not state.selectedIds)
			const allChildrenSelected =
				parent.childIds.length > 0 &&
				parent.childIds.every((childId) => result.includes(childId));

			if (allChildrenSelected) {
				// Remove all children from selection
				result = result.filter((id) => !parent.childIds.includes(id));

				// Add parent to selection (if not already there)
				if (!result.includes(parentId)) {
					result.push(parentId);
					changed = true;
				}
			}
		}
	}

	return result;
}
