import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { GroupState } from "../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../CanvasTypes";
import { updateGroupBounds } from "../ui/utils/updateGroupBounds";

/**
 * Finds the root group of the given group and updates all group bounds
 * in the subtree from root downward (children first, then parent).
 *
 * @param state - Current canvas controller state with updated object positions
 * @param groupId - ID of the group whose root subtree should be updated
 * @returns Updated canvas controller state with recalculated group bounds
 */
export function updateGroupBoundsFromRoot(
	state: CanvasControllerState,
	groupId: string,
): CanvasControllerState {
	const rootGroupId = findRootGroupId(state.objects, groupId);
	if (!rootGroupId) {
		return state;
	}

	const updatedObjects = { ...state.objects };
	updateGroupsFromRoot(updatedObjects, rootGroupId);

	return {
		...state,
		objects: updatedObjects,
	};
}

/**
 * Traverses upward from the given object to find the topmost ancestor group.
 *
 * Returns the root id only when it actually resolves to a group; if the start
 * object does not exist, or the topmost ancestor is not a group (e.g. an
 * ungrouped shape), `undefined` is returned so the caller can early-return
 * without copying the object map.
 */
function findRootGroupId(
	objects: Record<string, ObjectState>,
	groupId: string,
): string | undefined {
	let currentId: string | undefined = groupId;
	let rootId: string | undefined = undefined;

	while (currentId) {
		const obj: ObjectState | undefined = objects[currentId];
		if (!obj) {
			break;
		}

		rootId = currentId;
		currentId = obj.parentId;
	}

	if (!rootId || objects[rootId]?.type !== "group") {
		return undefined;
	}

	return rootId;
}

/**
 * Recursively updates all groups in the subtree rooted at the given group.
 * Processes children first to ensure correct bottom-up bounds propagation.
 *
 * The group hierarchy is a validated tree (acyclic) by the time it reaches
 * internal code, so recursion terminates without a cycle guard.
 */
function updateGroupsFromRoot(
	objects: Record<string, ObjectState>,
	groupId: string,
): void {
	const group = objects[groupId];
	if (!group || group.type !== "group") {
		return;
	}

	const groupState = group as GroupState;

	for (const childId of groupState.childIds ?? []) {
		const child = objects[childId];
		if (child?.type === "group") {
			updateGroupsFromRoot(objects, childId);
		}
	}

	const updatedGroup = updateGroupBounds(objects, groupId);
	if (updatedGroup) {
		objects[groupId] = updatedGroup;
	}
}
