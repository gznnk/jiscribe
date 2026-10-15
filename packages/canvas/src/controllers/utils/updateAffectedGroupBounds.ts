import type { Point } from "@jiscribe/geometry";

import {
	copyObjectsRecord,
	createCowObjects,
	isCowObjects,
} from "./cowObjects";
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
 * @param changedIds - IDs of the objects whose geometry changed; ids with no parent contribute nothing unless `includeChangedGroups` names them
 * @param includeChangedGroups - When true, a changed id that is itself a group is recomputed too (its `childIds` may be what changed); defaults to false, settling ancestors only
 * @returns Updated canvas controller state with recalculated group bounds; its `objects` is a copy-on-write view when `state.objects` was one, and a plain Record otherwise
 */
export function updateAffectedGroupBounds(
	state: CanvasControllerState,
	changedIds: readonly string[],
	includeChangedGroups = false,
): CanvasControllerState {
	const affectedGroupIds = new Set<string>();

	// Collect all parent groups (and their ancestors) of the changed objects
	for (const changedId of changedIds) {
		const obj = state.objects[changedId];
		if (!obj) {
			continue;
		}
		if (includeChangedGroups && obj.type === "group") {
			affectedGroupIds.add(changedId);
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

	// A view stays a view: copying it would cost O(all objects) per drag frame
	// and leave the passes after this one nothing to narrow their scan to
	// (collectCowChangedKeys). Whoever handed over the view still flattens it
	// (#213). A plain Record is copied, since nothing downstream would flatten a
	// view made here.
	const updatedObjects = isCowObjects(state.objects)
		? createCowObjects(state.objects)
		: copyObjectsRecord(state.objects);
	// Leaf points do not move during the pass (only group frames are written), so
	// a deeper group's points stay valid for its ancestors.
	const pointCache = new Map<string, Point[]>();
	for (const groupId of sortedGroupIds) {
		const updatedGroup = updateGroupBounds(updatedObjects, groupId, pointCache);
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
