import { isConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { calculateOrientedBoundsFromChildIds } from "../../../states/utils/calculateGroupOrientedBounds";
import type { CanvasControllerState } from "../../CanvasTypes";
import { cleanupGroups } from "../../utils/cleanupGroups";
import { findLowestCommonAncestor } from "../../utils/findLowestCommonAncestor";
import { sortObjectIdsByZOrder } from "../../utils/sortObjectIdsByZOrder";
import { updateGroupBoundsFromRoot } from "../../utils/updateGroupBoundsFromRoot";
import type { Command } from "../CommandTypes";

export const GroupCommand: Command = {
	id: "group",
	label: "Group",
	category: "arrange",
	shortcuts: {
		mac: [{ code: "KeyG", meta: true }],
		win: [{ code: "KeyG", ctrl: true }],
		default: [{ code: "KeyG", ctrl: true }],
	},

	// Connectors are never groupable (they follow their endpoints, not a group transform),
	// so only shape-type selections count toward the "2 or more" requirement.
	canExecute: (state) =>
		state.selectedIds.filter((id) => !isConnectorState(state.objects[id]))
			.length >= 2,

	execute: (state) => {
		const groupId = crypto.randomUUID();
		// Defensively drop connectors here too: even if a selection path leaks a connector
		// into selectedIds, it must not be pulled into the group (the bounds calculation
		// would treat it as a Poly and use its waypoints only, yielding a wrong OBB).
		const selectedIds = state.selectedIds.filter(
			(id) => !isConnectorState(state.objects[id]),
		);
		const selectedSet = new Set(selectedIds);
		const lockAspectRatio = state.multiSelectGroup?.lockAspectRatio ?? false;

		// Decide which group the new group is placed directly under, using the LCA (lowest common ancestor).
		// Example: selecting rect-1 and rect-2 under group-A yields an LCA of group-A, and the
		// new group is inserted as a child of group-A.
		// If the selected items share no common ancestor group, it is undefined (placed at the root).
		const lcaId = findLowestCommonAncestor(selectedIds, state.objects);

		// Sort selectedIds by z-order so the shapes' stacking order is preserved after grouping
		const childIds = sortObjectIdsByZOrder(
			selectedIds,
			state.objects,
			state.rootIds,
		);

		// Compute the new group's bounds directly from its children-to-be
		// (the group does not exist yet, so no placeholder object is needed)
		const bounds = calculateOrientedBoundsFromChildIds(
			state.objects,
			childIds,
			{
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			},
		);

		// GroupState invariant: never create a group without a valid (> 0) frame.
		// bounds is null only when no selected shape contributes geometry, which
		// canExecute should already rule out — abort instead of creating a
		// zero-size group (the divisor in transformFrameByGroup).
		if (!bounds) {
			return state;
		}

		// Create the group with the computed bounds
		const newGroup = {
			id: groupId,
			type: "group",
			parentId: lcaId,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			childIds,
			cx: bounds.cx,
			cy: bounds.cy,
			width: bounds.width,
			height: bounds.height,
			lockAspectRatio,
		} as unknown as GroupState;

		// Add the new group to objects and reassign each child item's parentId to the new group
		const updatedObjects = { ...state.objects, [groupId]: newGroup };
		for (const childId of childIds) {
			updatedObjects[childId] = {
				...updatedObjects[childId],
				parentId: groupId,
			};
		}

		// Remove each selected item from its original parent group's childIds.
		// Record the affected parents in affectedParentIds since their bounds must be updated later.
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

		let updatedRootIds = state.rootIds;

		if (lcaId != null) {
			// ── LCA exists: append the new group to the end of the LCA's childIds (frontmost) ──────────────
			const currentLcaChildIds = (updatedObjects[lcaId] as GroupState).childIds;

			updatedObjects[lcaId] = {
				...(updatedObjects[lcaId] as GroupState),
				childIds: [...currentLcaChildIds, groupId],
			} as GroupState;

			// The LCA itself is never removed from rootIds by the selected items, so
			// remove any selected items that were at the root
			updatedRootIds = state.rootIds.filter((id) => !selectedSet.has(id));
		} else {
			// ── No LCA: place the new group at the end of the root (frontmost) ──────────────
			updatedObjects[groupId] = {
				...(updatedObjects[groupId] as GroupState),
				parentId: undefined,
			} as GroupState;

			const currentRootIds = state.rootIds.filter((id) => !selectedSet.has(id));
			updatedRootIds = [...currentRootIds, groupId];
		}

		// Clean up groups (including the LCA) that became empty or singletons as a side effect of removing the selected items.
		// If the LCA itself is reduced to one item, cleanupGroups dissolves it (this is correct behavior).
		let nextState: CanvasControllerState = {
			...state,
			objects: updatedObjects,
			rootIds: updatedRootIds,
			selectedIds: [groupId],
			objectMenuOpenId: null,
			shapeLibraryOpenCategory: null,
			lastDuplicate: null,
			commitVersion: state.commitVersion + 1,
		};
		for (const parentId of affectedParentIds) {
			nextState = updateGroupBoundsFromRoot(nextState, parentId);
		}
		return cleanupGroups(nextState);
	},
};
