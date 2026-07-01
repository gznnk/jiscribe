import { updateGroupBounds } from "./updateGroupBounds";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { GroupState } from "../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Cleans up groups.
 *
 * - 0 shapes in a group → delete the group
 * - 1 shape in a group → ungroup and move the shape to the parent group (or root)
 * - 2 or more shapes in a group → keep the group
 *
 * @param state - the current canvas controller state
 * @returns the canvas controller state after cleanup
 */
export const cleanupGroups = (
	state: CanvasControllerState,
): CanvasControllerState => {
	const updatedObjects = { ...state.objects };
	const updatedRootIds = [...state.rootIds];
	const groupsToProcess = new Set<string>();

	// Collect all groups as cleanup candidates
	for (const [id, obj] of Object.entries(updatedObjects)) {
		if (obj?.type === "group") {
			groupsToProcess.add(id);
		}
	}

	// Repeat until nothing changes (to handle nested groups)
	let hasChanges = true;
	while (hasChanges) {
		hasChanges = false;

		for (const groupId of groupsToProcess) {
			const group = updatedObjects[groupId] as GroupState | undefined;
			if (!group || group.type !== "group") {
				groupsToProcess.delete(groupId);
				continue;
			}

			const childCount = group.childIds.length;

			if (childCount === 0) {
				// Group is empty → delete the group
				hasChanges = true;
				groupsToProcess.delete(groupId);

				if (group.parentId != null) {
					// Remove from the parent group
					const parent = updatedObjects[group.parentId];
					if (parent?.type === "group") {
						const parentGroup = parent as GroupState;
						updatedObjects[group.parentId] = {
							...parentGroup,
							childIds: parentGroup.childIds.filter(
								(cid: string) => cid !== groupId,
							),
						} as GroupState;

						// Update the parent's bounds after removal
						const updatedParent = updateGroupBounds(
							updatedObjects,
							group.parentId,
						);
						if (updatedParent) {
							updatedObjects[group.parentId] = updatedParent;
						}

						// Re-queue the parent for checking
						groupsToProcess.add(group.parentId);
					}
				} else {
					// Remove from root
					const index = updatedRootIds.indexOf(groupId);
					if (index !== -1) {
						updatedRootIds.splice(index, 1);
					}
				}

				// Delete the object
				delete updatedObjects[groupId];
			} else if (childCount === 1) {
				// One shape in the group → ungroup
				hasChanges = true;
				groupsToProcess.delete(groupId);

				const childId = group.childIds[0];
				const child = updatedObjects[childId];
				if (!child) {
					continue;
				}

				if (group.parentId != null) {
					// Move the child into the parent group
					const parent = updatedObjects[group.parentId];
					if (parent?.type === "group") {
						const parentGroup = parent as GroupState;
						updatedObjects[group.parentId] = {
							...parentGroup,
							childIds: parentGroup.childIds.map((cid: string) =>
								cid === groupId ? childId : cid,
							),
						} as GroupState;

						// Update the parent's bounds after the move
						const updatedParent = updateGroupBounds(
							updatedObjects,
							group.parentId,
						);
						if (updatedParent) {
							updatedObjects[group.parentId] = updatedParent;
						}

						// Re-queue the parent for checking
						groupsToProcess.add(group.parentId);
					}

					// Update the child's parent
					updatedObjects[childId] = {
						...child,
						parentId: group.parentId,
					} as ObjectState;
				} else {
					// Move the child to root
					const index = updatedRootIds.indexOf(groupId);
					if (index !== -1) {
						updatedRootIds[index] = childId;
					}

					// Detach the child's parent
					updatedObjects[childId] = {
						...child,
						parentId: undefined,
					} as ObjectState;
				}

				// Delete the group
				delete updatedObjects[groupId];
			} else {
				// 2 or more → cleanup complete
				groupsToProcess.delete(groupId);
			}
		}
	}

	return {
		...state,
		objects: updatedObjects,
		rootIds: updatedRootIds,
	};
};
