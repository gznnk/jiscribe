import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { updateGroupBounds } from "../../../../../utils/updateGroupBounds";

/**
 * Updates the bounding frame of a single group without affecting parent groups.
 * This is used during drag operations to update only the selected group's bounds.
 *
 * @param state - Current canvas controller state
 * @param groupId - ID of the group to update
 * @returns Updated canvas controller state with recalculated group bounds
 */
export function updateSingleGroupBounds(
	state: CanvasControllerState,
	groupId: string,
): CanvasControllerState {
	const updatedGroup = updateGroupBounds(state.objects, groupId);

	if (!updatedGroup) {
		return state;
	}

	return {
		...state,
		objects: {
			...state.objects,
			[groupId]: updatedGroup,
		},
	};
}
