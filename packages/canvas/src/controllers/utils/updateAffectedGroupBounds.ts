import { copyObjectsRecord } from "./cowObjects";
import { updateGroupBounds } from "./updateGroupBounds";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Updates the bounding frames of all parent groups affected by objects whose
 * geometry changed — moved, transformed, or re-measured from their own content.
 * Processes groups from bottom-up (children first, then parents) to ensure correct bounds.
 *
 * @param state - Current canvas controller state, already holding the changed objects
 * @param changedIds - IDs of the objects whose geometry changed; ids with no parent contribute nothing
 * @returns Updated canvas controller state with recalculated group bounds
 */
export function updateAffectedGroupBounds(
	state: CanvasControllerState,
	changedIds: string[],
): CanvasControllerState {
	const affectedGroupIds = new Set<string>();

	// Collect all parent groups (and their ancestors) of the changed objects
	for (const changedId of changedIds) {
		const obj = state.objects[changedId];
		if (!obj) {
			continue;
		}

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

	// Update bounds for each affected group.
	// Copied through copyObjectsRecord rather than spread: a drag ends with the
	// map still held as a copy-on-write view, and spreading one pays a Proxy trap
	// per key for the identical result.
	const updatedObjects = copyObjectsRecord(state.objects);
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
		if (!obj) {
			break;
		}
		currentId = obj.parentId;
		if (currentId) {
			depth++;
		}
	}

	return depth;
}
