import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { computeDuplicateOffset } from "./utils/computeDuplicateOffset";
import { getSelectionCenter } from "./utils/getSelectionCenter";
import { selectConnectorsInSelection } from "./utils/selectConnectorsInSelection";
import { buildSelectedIdsWithDescendants } from "../../utils/buildSelectedIdsWithDescendants";
import { cloneObjects } from "../../utils/cloneObjects";
import { createMultiSelectGroup } from "../../utils/createMultiSelectGroup";
import { getRootConnectorIds } from "../../utils/getRootConnectorIds";
import { sortObjectIdsByZOrder } from "../../utils/sortObjectIdsByZOrder";
import { updateGroupBoundsFromRoot } from "../../utils/updateGroupBoundsFromRoot";
import type { Command } from "../CommandTypes";

export const DuplicateCommand: Command = {
	id: "duplicate",
	label: "Duplicate",
	category: "edit",
	shortcuts: {
		mac: [{ code: "KeyD", meta: true }],
		win: [{ code: "KeyD", ctrl: true }],
		default: [{ code: "KeyD", ctrl: true }],
	},

	canExecute: (state) => state.selectedIds.length > 0,

	execute: (state, registries) => {
		const { selectedIds } = state;

		// ── 1. Collect the objects to duplicate ─────────────────────────────────────
		const selectedIdsWithDescendants = buildSelectedIdsWithDescendants(
			selectedIds,
			state.objects,
		);

		const allObjects: Record<string, ObjectState> = {};
		for (const id of selectedIdsWithDescendants) {
			const obj = state.objects[id];
			if (obj) {
				allObjects[id] = obj;
			}
		}

		// Only duplicate connectors whose both endpoints are within the selection (same check as CopyCommand)
		const connectorIds = selectConnectorsInSelection(
			getRootConnectorIds(state.objects, state.rootIds),
			state.objects,
			selectedIdsWithDescendants,
		);
		for (const connId of connectorIds) {
			allObjects[connId] = state.objects[connId];
		}

		// ── 2. Determine the destination group ───────────────────────────────────────────
		// If all selected objects share the same parentId, duplicate inside that parent group.
		// A parentId of undefined (root level) is treated as null.
		const firstParentId = state.objects[selectedIds[0]]?.parentId;
		const allSameParent = selectedIds.every(
			(id) => state.objects[id]?.parentId === firstParentId,
		);
		// targetGroupId: string → duplicate within group, null → duplicate at root
		const targetGroupId: string | null =
			allSameParent && firstParentId != null ? firstParentId : null;

		// ── 3. Compute the offset (move-aware) ────────────────────────────────────
		const offset = computeDuplicateOffset(state);

		// ── 4. Duplicate the objects ─────────────────────────────────────────────
		// Sort the copy targets (objects + connectors) by z-order and duplicate them.
		// cloneObjects returns the new IDs in the same order, so for a root duplicate they can be stacked to the front as-is.
		const topLevelIds = sortObjectIdsByZOrder(
			[...selectedIds, ...connectorIds],
			state.objects,
			state.rootIds,
		);
		const { newObjects, newTopLevelIds } = cloneObjects(
			topLevelIds,
			allObjects,
			offset,
			registries.objectBehavior,
		);

		const mergedObjects = { ...state.objects, ...newObjects };

		// Split the new IDs into shapes and connectors by type.
		const newObjectIds = newTopLevelIds.filter(
			(id) => mergedObjects[id]?.type !== "connector",
		);
		const newConnectorIds = newTopLevelIds.filter(
			(id) => mergedObjects[id]?.type === "connector",
		);

		// ── 5. Insert into the destination group ────────────────────────────────────
		let updatedRootIds = state.rootIds;

		if (targetGroupId !== null) {
			// In-group duplicate: set parentId to the common parent group
			for (const newId of newObjectIds) {
				mergedObjects[newId] = {
					...mergedObjects[newId],
					parentId: targetGroupId,
				};
			}

			// Insert the new objects into the parent group's childIds (right after the last selected position)
			const parentGroup = mergedObjects[targetGroupId] as GroupState;
			const childIds = [...parentGroup.childIds];
			const selectedSet = new Set(selectedIds);
			const lastSelectedIndex = childIds.reduce(
				(max, id, i) => (selectedSet.has(id) ? i : max),
				-1,
			);
			childIds.splice(lastSelectedIndex + 1, 0, ...newObjectIds);
			mergedObjects[targetGroupId] = {
				...parentGroup,
				childIds,
			} as GroupState;
			// Connectors are never children of a group, so add the duplicated ones to the top-level rootIds
			if (newConnectorIds.length > 0) {
				updatedRootIds = [...state.rootIds, ...newConnectorIds];
			}
		} else {
			// Root duplicate: append newTopLevelIds (z-order preserved) to the front (end) as-is.
			updatedRootIds = [...state.rootIds, ...newTopLevelIds];
		}

		// ── 6. Assemble the state ─────────────────────────────────────────────────
		let nextState: CanvasControllerState = {
			...state,
			objects: mergedObjects,
			rootIds: updatedRootIds,
			selectedIds: newObjectIds,
			multiSelectGroup: createMultiSelectGroup(
				newObjectIds,
				mergedObjects,
				null,
			),
			commitVersion: state.commitVersion + 1,
		};

		// For an in-group duplicate, recompute the parent group's bounds
		if (targetGroupId !== null) {
			nextState = updateGroupBoundsFromRoot(nextState, targetGroupId);
		}

		// ── 7. Update lastDuplicate (for the next move-aware offset calculation) ──────
		const newCenter = getSelectionCenter(nextState, newObjectIds);

		return {
			...nextState,
			lastDuplicate: newCenter
				? { newIds: newObjectIds, cx: newCenter.cx, cy: newCenter.cy, offset }
				: null,
		};
	},
};
