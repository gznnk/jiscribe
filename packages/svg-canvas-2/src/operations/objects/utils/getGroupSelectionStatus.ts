import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { GroupState } from "../../../states/objects/primitives/GroupState";

/**
 * Checks if a group has any selected children.
 *
 * @param state - The canvas state
 * @param groupId - The ID of the group to check
 * @returns true if at least one child is selected, false otherwise
 *
 * @example
 * // Group with 3 children, 1 selected
 * hasSelectedChildren(state, 'group-1') // true
 *
 * // Group with 3 children, none selected
 * hasSelectedChildren(state, 'group-2') // false
 */
export function hasSelectedChildren(
	state: CanvasState,
	groupId: string,
): boolean {
	const group = state.objects[groupId];
	if (!group || group.type !== "group") {
		return false;
	}

	const groupState = group as GroupState;
	return groupState.childIds.some((childId) =>
		state.selectedIds.includes(childId),
	);
}

/**
 * Checks if all children of a group are selected.
 * Returns false if the group is empty or if any child is not selected.
 *
 * @param state - The canvas state
 * @param groupId - The ID of the group to check
 * @returns true if all children are selected, false otherwise
 *
 * @example
 * // Group with 3 children, all selected
 * areAllChildrenSelected(state, 'group-1') // true
 *
 * // Group with 3 children, only 2 selected
 * areAllChildrenSelected(state, 'group-2') // false
 *
 * // Empty group
 * areAllChildrenSelected(state, 'group-3') // false
 */
export function areAllChildrenSelected(
	state: CanvasState,
	groupId: string,
): boolean {
	const group = state.objects[groupId];
	if (!group || group.type !== "group") {
		return false;
	}

	const groupState = group as GroupState;

	// Empty groups are not considered "all selected"
	if (groupState.childIds.length === 0) {
		return false;
	}

	return groupState.childIds.every((childId) =>
		state.selectedIds.includes(childId),
	);
}
