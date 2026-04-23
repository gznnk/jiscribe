import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { calculateGroupOrientedBounds } from "../../ui/utils/calculateGroupOrientedBounds";
import { cleanupGroups } from "../../utils/cleanupGroups";
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
		return state.selectedIds.length >= 2;
	},

	execute: (state) => {
		const groupId = crypto.randomUUID();
		const selectedIds = state.selectedIds;

		// Check if all selected objects share the same parent
		const firstParentId = state.objects[selectedIds[0]]?.parentId;
		const isSameParent = selectedIds.every(
			(id) => state.objects[id]?.parentId === firstParentId,
		);
		const commonParentId = isSameParent ? firstParentId : undefined;

		// Build childIds: preserve z-order from source list for same-parent, use selectedIds order for cross-parent
		let childIds: string[];
		if (isSameParent) {
			const sourceIds =
				commonParentId != null
					? (state.objects[commonParentId] as GroupState).childIds
					: state.rootIds;
			childIds = sourceIds.filter((id) => selectedIds.includes(id));
		} else {
			childIds = [...selectedIds];
		}

		// Create temporary group state to calculate bounds
		const tempGroup = {
			id: groupId,
			type: "group",
			parentId: commonParentId,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			childIds,
			cx: 0,
			cy: 0,
			width: 0,
			height: 0,
		} as unknown as GroupState;

		const tempObjects = { ...state.objects, [groupId]: tempGroup };
		const bounds = calculateGroupOrientedBounds(tempObjects, groupId);

		const newGroup = {
			...tempGroup,
			cx: bounds?.cx ?? 0,
			cy: bounds?.cy ?? 0,
			width: bounds?.width ?? 0,
			height: bounds?.height ?? 0,
		} as unknown as GroupState;

		// Update children: set parentId to new group
		const updatedObjects = { ...state.objects, [groupId]: newGroup };
		for (const childId of childIds) {
			updatedObjects[childId] = {
				...updatedObjects[childId],
				parentId: groupId,
			};
		}

		if (isSameParent) {
			// Same parent: replace selected ids with group id at the position of the first selected
			const sourceIds =
				commonParentId != null
					? (state.objects[commonParentId] as GroupState).childIds
					: state.rootIds;
			const updatedSourceIds = replaceWithGroup(sourceIds, selectedIds, groupId);

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
		}

		// Cross-parent: remove each selected object from its current parent, add new group at root
		const selectedSet = new Set(selectedIds);
		for (const id of selectedIds) {
			const parentId = state.objects[id]?.parentId;
			if (parentId != null) {
				const parent = updatedObjects[parentId] as GroupState;
				if (parent) {
					updatedObjects[parentId] = {
						...parent,
						childIds: parent.childIds.filter((cid) => cid !== id),
					} as GroupState;
				}
			}
		}

		const updatedRootIds = state.rootIds.filter((id) => !selectedSet.has(id));
		updatedRootIds.push(groupId);

		const nextState = {
			...state,
			objects: updatedObjects,
			rootIds: updatedRootIds,
			selectedIds: [groupId],
			objectMenuOpenId: null,
			lastCommitTime: Date.now(),
		};

		return cleanupGroups(nextState);
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
