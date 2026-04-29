import { updateGroupBounds } from "../../../controllers/ui/utils/updateGroupBounds";
import type { CanvasControllerState } from "../../CanvasTypes";

/**
 * Updates the bounding frames of all parent groups affected by moving the selected objects.
 * Processes groups from bottom-up (children first, then parents) to ensure correct bounds.
 *
 * @param state - Current canvas controller state with updated object positions
 * @param selectedIds - IDs of objects that were moved
 * @returns Updated canvas controller state with recalculated group bounds
 */
export function updateAffectedGroupBounds(
	state: CanvasControllerState,
	selectedIds: string[],
): CanvasControllerState {
	const affectedGroupIds = new Set<string>();

	// Collect all parent groups (and their ancestors) of selected objects
	for (const selectedId of selectedIds) {
		const obj = state.objects[selectedId];
		if (!obj) continue;

		// Collect all ancestor groups (parent, grandparent, etc.)
		let currentParentId = obj.parentId;
		while (currentParentId) {
			affectedGroupIds.add(currentParentId);
			const parent = state.objects[currentParentId];
			currentParentId = parent?.parentId;
		}
	}

	// If no groups need updating, return state as-is
	if (affectedGroupIds.size === 0) {
		return state;
	}

	// Sort groups by depth (deepest first) to ensure bottom-up processing
	const withDepth = Array.from(affectedGroupIds).map((id) => ({
		id,
		depth: getGroupDepth(state.objects, id),
	}));
	withDepth.sort((a, b) => b.depth - a.depth); // Descending order (deepest first)
	const sortedGroupIds = withDepth.map((x) => x.id);

	// Update bounds for each affected group
	const updatedObjects = { ...state.objects };
	for (const groupId of sortedGroupIds) {
		const updatedGroup = updateGroupBounds(updatedObjects, groupId);
		if (updatedGroup) {
			updatedObjects[groupId] = updatedGroup;
		}
	}

	return {
		...state,
		objects: updatedObjects,
	};
}

/**
 * Calculates the depth of a group in the hierarchy (0 = root level).
 */
function getGroupDepth(
	objects: Record<string, { parentId?: string }>,
	groupId: string,
): number {
	let depth = 0;
	let currentId: string | undefined = groupId;

	while (currentId) {
		const obj: { parentId?: string } | undefined = objects[currentId];
		if (!obj) break;
		currentId = obj.parentId;
		if (currentId) depth++;
	}

	return depth;
}
