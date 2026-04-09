import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { updateGroupBounds } from "../../ui/utils/updateGroupBounds";
import type { Command } from "../CommandTypes";

export const UngroupCommand: Command = {
	id: "ungroup",
	label: "グループ解除",
	category: "arrange",
	shortcuts: {
		mac: [{ key: "g", meta: true, shift: true }],
		win: [{ key: "g", ctrl: true, shift: true }],
		default: [{ key: "g", ctrl: true, shift: true }],
	},

	canExecute: (state) => {
		if (state.selectedIds.length === 0) return false;
		// All selected objects must be groups
		return state.selectedIds.every((id) => state.objects[id]?.type === "group");
	},

	execute: (state) => {
		const updatedObjects = { ...state.objects };
		let updatedRootIds = [...state.rootIds];
		const promotedChildIds: string[] = [];

		for (const groupId of state.selectedIds) {
			const group = updatedObjects[groupId] as GroupState;
			if (!group || group.type !== "group") continue;

			const parentId = group.parentId;
			const childIds = group.childIds;

			// Promote children: set their parentId to the group's parent
			for (const childId of childIds) {
				updatedObjects[childId] = {
					...updatedObjects[childId],
					parentId,
				};
				// Remove parentId entirely if promoting to root
				if (parentId == null) {
					delete updatedObjects[childId].parentId;
				}
				promotedChildIds.push(childId);
			}

			// Replace group with its children in the appropriate list
			if (parentId != null) {
				// Group is inside another group: update parent's childIds
				const parent = updatedObjects[parentId] as GroupState;
				updatedObjects[parentId] = {
					...parent,
					childIds: parent.childIds.flatMap((id) =>
						id === groupId ? childIds : [id],
					),
				} as GroupState;

				// Update parent's bounds after child list changes
				const updatedParent = updateGroupBounds(updatedObjects, parentId);
				if (updatedParent) {
					updatedObjects[parentId] = updatedParent;
				}
			} else {
				// Group is at root: update rootIds
				updatedRootIds = updatedRootIds.flatMap((id) =>
					id === groupId ? childIds : [id],
				);
			}

			// Remove the group object
			delete updatedObjects[groupId];
		}

		return {
			...state,
			objects: updatedObjects,
			rootIds: updatedRootIds,
			selectedIds: promotedChildIds,
			objectMenuOpenId: null,
			lastCommitTime: Date.now(),
		};
	},
};
