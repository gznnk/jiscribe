import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { calculateGroupOrientedBounds } from "../../../states/utils/calculateGroupOrientedBounds";
import type { CanvasControllerState } from "../../CanvasTypes";
import { cleanupGroups } from "../../utils/cleanupGroups";
import { findLowestCommonAncestor } from "../../utils/findLowestCommonAncestor";
import { updateGroupBoundsFromRoot } from "../../utils/updateGroupBoundsFromRoot";
import type { Command } from "../CommandTypes";

export const GroupCommand: Command = {
	id: "group",
	label: "Group",
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

		// multiSelectGroupからlockAspectRatioを引き継ぐ
		const lockAspectRatio = state.multiSelectGroup?.lockAspectRatio ?? false;

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
			lockAspectRatio,
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
			const updatedSourceIds = replaceWithGroup(
				sourceIds,
				selectedIds,
				groupId,
			);

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
					commitVersion: state.commitVersion + 1,
				};
			}

			return {
				...state,
				objects: updatedObjects,
				rootIds: updatedSourceIds,
				selectedIds: [groupId],
				objectMenuOpenId: null,
				commitVersion: state.commitVersion + 1,
			};
		}

		// Cross-parent: remove each selected object from its current parent
		const selectedSet = new Set(selectedIds);
		const affectedParentIds = new Set<string>();
		for (const id of selectedIds) {
			const parentId = state.objects[id]?.parentId;
			if (parentId != null) {
				const parent = updatedObjects[parentId] as GroupState;
				if (parent) {
					updatedObjects[parentId] = {
						...parent,
						childIds: parent.childIds.filter((cid) => cid !== id),
					} as GroupState;
					affectedParentIds.add(parentId);
				}
			}
		}

		// Find LCA to determine where to place the new group
		const lcaId = findLowestCommonAncestor(selectedIds, state.objects);

		if (lcaId != null) {
			// LCA found: insert new group inside LCA at the correct z-position
			const originalLcaChildIds = (state.objects[lcaId] as GroupState).childIds;

			// Find the earliest LCA-entry position among selected items
			let earliestPos = originalLcaChildIds.length;
			for (const id of selectedIds) {
				const lcaEntry = findLcaEntry(id, lcaId, state.objects);
				if (lcaEntry != null) {
					const pos = originalLcaChildIds.indexOf(lcaEntry);
					if (pos !== -1) earliestPos = Math.min(earliestPos, pos);
				}
			}

			// Adjust insert position: account for items removed from LCA's childIds
			const currentLcaChildIds = (updatedObjects[lcaId] as GroupState).childIds;
			let removedBefore = 0;
			for (let i = 0; i < earliestPos; i++) {
				if (!currentLcaChildIds.includes(originalLcaChildIds[i]!)) {
					removedBefore++;
				}
			}
			const adjustedInsertPos = earliestPos - removedBefore;

			const updatedLcaChildIds = [...currentLcaChildIds];
			updatedLcaChildIds.splice(adjustedInsertPos, 0, groupId);
			updatedObjects[lcaId] = {
				...(updatedObjects[lcaId] as GroupState),
				childIds: updatedLcaChildIds,
			} as GroupState;
			// Update new group's parentId to LCA
			updatedObjects[groupId] = {
				...(updatedObjects[groupId] as GroupState),
				parentId: lcaId,
			} as GroupState;

			// Remove empty groups that resulted from pulling items out (up to LCA, not including LCA)
			for (const parentId of affectedParentIds) {
				if (parentId !== lcaId) {
					removeEmptyGroupUpToLca(updatedObjects, parentId, lcaId);
				}
			}

			let nextState: CanvasControllerState = {
				...state,
				objects: updatedObjects,
				rootIds: state.rootIds,
				selectedIds: [groupId],
				objectMenuOpenId: null,
				commitVersion: state.commitVersion + 1,
			};

			for (const parentId of affectedParentIds) {
				if (updatedObjects[parentId] != null) {
					nextState = updateGroupBoundsFromRoot(nextState, parentId);
				}
			}
			nextState = updateGroupBoundsFromRoot(nextState, lcaId);

			return nextState;
		}

		// No LCA: place new group at root
		const updatedRootIds = state.rootIds.filter((id) => !selectedSet.has(id));
		updatedRootIds.push(groupId);

		let nextState: CanvasControllerState = {
			...state,
			objects: updatedObjects,
			rootIds: updatedRootIds,
			selectedIds: [groupId],
			objectMenuOpenId: null,
			commitVersion: state.commitVersion + 1,
		};

		for (const parentId of affectedParentIds) {
			nextState = updateGroupBoundsFromRoot(nextState, parentId);
		}

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

/**
 * Returns the direct child of lcaId that is an ancestor of (or equal to) id.
 */
function findLcaEntry(
	id: string,
	lcaId: string,
	objects: Record<string, ObjectState>,
): string | undefined {
	let currentId: string | undefined = id;
	const visited = new Set<string>();
	while (currentId != null) {
		if (visited.has(currentId)) break;
		visited.add(currentId);
		const obj: ObjectState | undefined = objects[currentId];
		if (obj?.parentId === lcaId) return currentId;
		if (obj?.parentId == null) return undefined;
		currentId = obj.parentId;
	}
	return undefined;
}

/**
 * Recursively removes an empty group and its empty ancestors up to (but not including) lcaId.
 */
function removeEmptyGroupUpToLca(
	objects: Record<string, ObjectState>,
	groupId: string,
	lcaId: string,
): void {
	if (groupId === lcaId) return;
	const group = objects[groupId] as GroupState | undefined;
	if (!group || group.type !== "group" || group.childIds.length !== 0) return;

	const parentId = group.parentId;
	delete objects[groupId];

	if (parentId != null) {
		const parent = objects[parentId] as GroupState | undefined;
		if (parent?.type === "group") {
			objects[parentId] = {
				...parent,
				childIds: parent.childIds.filter((cid) => cid !== groupId),
			} as GroupState;
			// Recurse if parent is now empty and is not LCA
			if (
				parentId !== lcaId &&
				(objects[parentId] as GroupState).childIds.length === 0
			) {
				removeEmptyGroupUpToLca(objects, parentId, lcaId);
			}
		}
	}
}
