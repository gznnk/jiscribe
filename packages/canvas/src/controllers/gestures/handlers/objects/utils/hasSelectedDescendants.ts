import type { CanvasState } from "../../../../../states/canvas/CanvasState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";

/**
 * Recursively checks if any descendants (at any depth) are selected.
 *
 * @param state - Canvas state
 * @param childIds - Direct child IDs to check
 * @param selectedIds - Currently selected IDs (Set for O(1) membership lookup;
 *   build it once at the call site and pass it through the recursion)
 * @returns true if any descendant is selected
 */
export function hasSelectedDescendants(
	state: CanvasState,
	childIds: string[],
	selectedIds: ReadonlySet<string>,
): boolean {
	for (const childId of childIds) {
		// Check if this child is selected
		if (selectedIds.has(childId)) {
			return true;
		}

		// Recursively check grandchildren if this is a group
		const child = state.objects[childId];
		if (child && child.type === "group") {
			const group = child as GroupState;
			if (hasSelectedDescendants(state, group.childIds, selectedIds)) {
				return true;
			}
		}
	}
	return false;
}
