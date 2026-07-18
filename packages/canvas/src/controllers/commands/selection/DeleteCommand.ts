import { isPoly } from "../../../schemas/objects/types/Poly";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { cleanupConnectorsOnDelete } from "../../utils/cleanupConnectorsOnDelete";
import { cleanupGroups } from "../../utils/cleanupGroups";
import { updateGroupBoundsFromRoot } from "../../utils/updateGroupBoundsFromRoot";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * Command that deletes the current selection. Prioritizes vertex deletion when a
 * vertex is selected; otherwise removes selected objects (with group descendants)
 * and the selected connector, then cleans up connectors and groups.
 */
export const DeleteCommand: ExecutableCommand = {
	id: "delete",
	label: "Delete",
	category: "edit",
	shortcuts: {
		default: [{ code: "Delete" }, { code: "Backspace" }],
	},

	canExecute: (state) => {
		return (
			state.selectedVertex !== null ||
			state.selectedIds.length > 0 ||
			state.selectedConnectorId !== null
		);
	},

	execute: (state) => {
		// When a selectedVertex exists, prioritize vertex deletion.
		// Even if selectedIds still contains objects, return from this branch so we
		// don't fall through to object deletion.
		if (state.selectedVertex !== null) {
			const { objectId, vertexIndex } = state.selectedVertex;
			const poly = state.objects[objectId];

			if (!isPoly(poly)) {
				return { ...state, selectedVertex: null };
			}

			const points = poly.points;
			const minPoints = poly.type === "polygon" ? 3 : 2;

			// Do not delete below the minimum vertex count
			if (points.length <= minPoints) {
				return state;
			}

			const newPoints = points.filter((_, i) => i !== vertexIndex);
			const updatedPoly = { ...poly, points: newPoints };

			let nextState: CanvasControllerState = {
				...state,
				objects: {
					...state.objects,
					[objectId]: updatedPoly,
				},
				selectedVertex: null,
				lastDuplicate: null,
				commitVersion: state.commitVersion + 1,
			};

			if (updatedPoly.parentId) {
				nextState = updateGroupBoundsFromRoot(nextState, updatedPoly.parentId);
			}

			return nextState;
		}

		// Collect the IDs to delete (for groups, recursively include descendants)
		const idsToDelete = new Set<string>();

		// idsToDelete also serves as the visited set. Since the id is added before
		// traversing its descendants, even a cyclic reference where childIds points
		// back to itself or an ancestor (e.g. childId === groupId) is cut off by the
		// leading has check, preventing a stack overflow.
		const collectIds = (id: string) => {
			if (idsToDelete.has(id)) {
				return;
			}
			idsToDelete.add(id);
			const obj = state.objects[id];
			if (obj?.type === "group") {
				for (const childId of (obj as GroupState).childIds) {
					collectIds(childId);
				}
			}
		};

		for (const id of state.selectedIds) {
			collectIds(id);
		}

		// Also add the selected connector to the deletion targets
		if (state.selectedConnectorId != null) {
			idsToDelete.add(state.selectedConnectorId);
		}

		// Clean up connectors (run first so coordinates resolve against the pre-delete state)
		const stateAfterConnectors = cleanupConnectorsOnDelete(state, idsToDelete);

		const updatedObjects = { ...stateAfterConnectors.objects };

		// Remove the target objects from objects
		for (const id of idsToDelete) {
			delete updatedObjects[id];
		}

		// For selected objects whose parent is not being deleted, remove them from the parent's childIds
		const affectedParentIds = new Set<string>();
		for (const id of state.selectedIds) {
			const obj = state.objects[id];
			if (obj?.parentId != null && !idsToDelete.has(obj.parentId)) {
				const parent = updatedObjects[obj.parentId];
				if (parent?.type === "group") {
					const groupParent = parent as GroupState;
					updatedObjects[obj.parentId] = {
						...groupParent,
						childIds: groupParent.childIds.filter((childId) => childId !== id),
					} as GroupState;
					affectedParentIds.add(obj.parentId);
				}
			}
		}

		let nextStateBeforeCleanup: CanvasControllerState = {
			...state,
			objects: updatedObjects,
			// Connectors are also included in rootIds, so from the rootIds left after
			// orphaned-connector cleanup, remove all deletion targets at once
			// (selected objects, descendants, and the selected connector).
			rootIds: stateAfterConnectors.rootIds.filter(
				(id) => !idsToDelete.has(id),
			),
			selectedIds: [] as string[],
			selectedConnectorId: null,
			objectMenuOpenId: null,
			shapeLibraryOpenCategory: null,
			lastDuplicate: null,
			commitVersion: state.commitVersion + 1,
		};

		// Propagate the loss of leaf objects to all ancestor groups (do this before cleanupGroups).
		// After cleanup, an ungrouped group's ID may be gone, causing updateGroupBoundsFromRoot to no-op.
		for (const parentId of affectedParentIds) {
			nextStateBeforeCleanup = updateGroupBoundsFromRoot(
				nextStateBeforeCleanup,
				parentId,
			);
		}

		// Group cleanup (delete empty groups, dissolve single-child groups)
		return cleanupGroups(nextStateBeforeCleanup);
	},
};
