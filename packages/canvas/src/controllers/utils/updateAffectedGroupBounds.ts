import { copyObjectsRecord } from "./cowObjects";
import { updateGroupBounds } from "./updateGroupBounds";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Updates the bounding frames of all parent groups affected by objects whose
 * geometry changed — moved, transformed, or re-measured from their own content.
 * Processes groups from bottom-up (children first, then parents) to ensure correct bounds.
 *
 * **If you are here because a group's frame came out stale, read this.** A
 * group's box is cached on the group object, never derived on read, so something
 * has to recompute it after a child's box moves, and there are only two kinds of
 * caller that do:
 *
 * - the writer itself, naming the ids it just touched (this function, or
 *   `updateGroupBoundsFromRoot` / `updateGroupBoundsForSelection`);
 * - the two settling passes that diff the map and need no telling
 *   (`reconcileObjectContentSizes`, `reconcileGroupBounds`).
 *
 * The trap is that the first of those passes settles ancestors **only for the
 * objects its own content resizer moved**. A writer that hands over an object
 * whose box it already derived leaves the resizer with nothing to do, so it
 * returns the state by reference and no group is recomputed — which is why
 * settling used to depend on *how* an edit was made rather than on what it did
 * (a grouped shape edited by a core writer naming its ids settled; the same edit
 * from a contributed command or a selection control did not).
 * `reconcileGroupBounds` is what closes that, at the
 * two points where core takes an object back from a writer it handed the state
 * to.
 *
 * @param state - Current canvas controller state, already holding the changed objects
 * @param changedIds - IDs of the objects whose geometry changed; ids with no parent contribute nothing
 * @returns Updated canvas controller state with recalculated group bounds
 */
export function updateAffectedGroupBounds(
	state: CanvasControllerState,
	changedIds: readonly string[],
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
