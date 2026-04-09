import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";

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

