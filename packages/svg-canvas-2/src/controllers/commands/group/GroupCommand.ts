import type { GroupState } from "../../../states/objects/primitives/GroupState";
import type { Command } from "../CommandTypes";

export const GroupCommand: Command = {
	id: "group",
	label: "グループ化",
	category: "arrange",
	shortcuts: {
		mac: [{ key: "g", meta: true }],
		win: [{ key: "g", ctrl: true }],
		default: [{ key: "g", ctrl: true }],
	},

	canExecute: (state) => {
		if (state.selectedIds.length < 2) return false;

		// All selected objects must share the same parent (or all be root-level)
		const parentIds = state.selectedIds.map(
			(id) => state.objects[id]?.parentId,
		);
		return parentIds.every((pid) => pid === parentIds[0]);
	},

	execute: (state) => {
		const groupId = crypto.randomUUID();
		const selectedIds = state.selectedIds;

		// Determine the common parent of selected objects
		const commonParentId = state.objects[selectedIds[0]]?.parentId;

		// Build childIds preserving z-order from the source list
		const sourceIds =
			commonParentId != null
				? (state.objects[commonParentId] as GroupState).childIds
				: state.rootIds;
		const childIds = sourceIds.filter((id) => selectedIds.includes(id));

		// Create new group state
		const newGroup = {
			id: groupId,
			type: "group",
			parentId: commonParentId,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			childIds,
		} as unknown as GroupState;

		// Update children: set parentId to new group
		const updatedObjects = { ...state.objects, [groupId]: newGroup };
		for (const childId of childIds) {
			updatedObjects[childId] = {
				...updatedObjects[childId],
				parentId: groupId,
			};
		}

		// Update the source list: replace selected ids with the group id at the position of the first selected
		const updatedSourceIds = replaceWithGroup(sourceIds, selectedIds, groupId);

		// If inside a parent group, update parent's childIds
		if (commonParentId != null) {
			const parent = updatedObjects[commonParentId] as GroupState;
			updatedObjects[commonParentId] = {
				...parent,
				childIds: updatedSourceIds,
			} as GroupState;
			return {
				...state,
				objects: updatedObjects,
				selectedIds: [groupId],
				objectMenuOpenId: null,
				lastCommitTime: Date.now(),
			};
		}

		return {
			...state,
			objects: updatedObjects,
			rootIds: updatedSourceIds,
			selectedIds: [groupId],
			objectMenuOpenId: null,
			lastCommitTime: Date.now(),
		};
	},
};

/**
 * Replace selected IDs with the group ID at the position of the first selected item.
 */
function replaceWithGroup(
	sourceIds: string[],
	selectedIds: string[],
	groupId: string,
): string[] {
	const selectedSet = new Set(selectedIds);
	const result: string[] = [];
	let groupInserted = false;
	for (const id of sourceIds) {
		if (selectedSet.has(id)) {
			if (!groupInserted) {
				result.push(groupId);
				groupInserted = true;
			}
		} else {
			result.push(id);
		}
	}
	return result;
}
