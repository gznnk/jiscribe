import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { createMultiSelectGroup } from "../../selection/readers/createMultiSelectGroup";
import { updateGroupBounds } from "../../utils/updateGroupBounds";
import type { ExecutableCommand } from "../CommandTypes";

export const UngroupCommand: ExecutableCommand = {
	id: "ungroup",
	label: { en: "Ungroup", ja: "グループ解除" },
	category: "arrange",
	shortcuts: {
		mac: [{ code: "KeyG", meta: true, shift: true }],
		win: [{ code: "KeyG", ctrl: true, shift: true }],
		default: [{ code: "KeyG", ctrl: true, shift: true }],
	},

	canExecute: (state) => {
		if (state.selection.objectIds.length === 0) {
			return false;
		}
		// All selected objects must be groups
		return state.selection.objectIds.every(
			(id) => state.objects[id]?.type === "group",
		);
	},

	execute: (state) => {
		const updatedObjects = { ...state.objects };
		let updatedRootIds = [...state.rootIds];
		const promotedChildIds: string[] = [];

		for (const groupId of state.selection.objectIds) {
			const group = updatedObjects[groupId] as GroupState;
			if (!group || group.type !== "group") {
				continue;
			}

			const parentId = group.parentId;
			const childIds = group.childIds;

			// Promote children: set their parentId to the group's parent (undefined if root)
			for (const childId of childIds) {
				updatedObjects[childId] = {
					...updatedObjects[childId],
					parentId: parentId ?? undefined,
				};
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
			selection: { objectIds: promotedChildIds, part: null },
			multiSelectGroup: createMultiSelectGroup(
				promotedChildIds,
				updatedObjects,
				null,
			),
			objectMenuOpenId: null,
			stencilLibraryOpenCategory: null,
			lastDuplicate: null,
			commitVersion: state.commitVersion + 1,
		};
	},
};
