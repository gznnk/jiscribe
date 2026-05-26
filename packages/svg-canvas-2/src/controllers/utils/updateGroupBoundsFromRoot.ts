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
 * Traverses upward from the given group to find the topmost ancestor group.
 */
function findRootGroupId(
	objects: Record<string, ObjectState>,
	groupId: string,
): string | undefined {
	let currentId: string | undefined = groupId;
	let rootId: string | undefined = groupId;
	const visited = new Set<string>();

	while (currentId) {
		if (visited.has(currentId)) {
			break;
		}
		visited.add(currentId);

		const obj: ObjectState | undefined = objects[currentId];
		if (!obj) {
			break;
		}

		rootId = currentId;
		currentId = obj.parentId;
	}

	return rootId;
}

/**
 * Recursively updates all groups in the subtree rooted at the given group.
 * Processes children first to ensure correct bottom-up bounds propagation.
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
