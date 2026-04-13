import type { CanvasState } from "../../../../../../states/canvas/CanvasState";
import { updateGroupBounds } from "../../../../../ui/utils/updateGroupBounds";

/**
 * Updates the bounding frame of a single group without affecting parent groups.
 * This is used during drag operations to update only the selected group's bounds.
 *
 * @param state - Current canvas state
 * @param groupId - ID of the group to update
 * @returns Updated canvas state with recalculated group bounds
 */
export function updateSingleGroupBounds(
	state: CanvasState,
	groupId: string,
): CanvasState {
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
