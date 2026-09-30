import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { VERTEX_PART_KIND } from "../../selection/createVertexPartDefinition";
import {
	canDeleteObjectParts,
	deleteObjectParts,
} from "../../selection/deleteObjectParts";
import type { ObjectPartSelection } from "../../selection/ObjectPartSelection";
import { cleanupConnectorsOnDelete } from "../../utils/cleanupConnectorsOnDelete";
import { cleanupGroups } from "../../utils/cleanupGroups";
import { updateGroupBoundsFromRoot } from "../../utils/updateGroupBoundsFromRoot";
import type { ExecutableCommand } from "../CommandTypes";

/** Reads the legacy single-vertex field as the part selection the registry takes. */
const toVertexPartSelection = (
	selectedVertex: NonNullable<CanvasControllerState["selectedVertex"]>,
): ObjectPartSelection => ({
	objectId: selectedVertex.objectId,
	kind: VERTEX_PART_KIND,
	partIds: [String(selectedVertex.vertexIndex)],
});

const clearSelectedVertex = (
	state: CanvasControllerState,
): CanvasControllerState => ({ ...state, selectedVertex: null });

const clearObjectPartSelection = (
	state: CanvasControllerState,
): CanvasControllerState => ({ ...state, objectPartSelection: null });

/**
 * Command that deletes the current selection. Prioritizes vertex deletion when a
 * vertex is selected; otherwise removes selected objects (with group descendants)
 * and the selected connector, then cleans up connectors and groups.
 */
export const DeleteCommand: ExecutableCommand = {
	id: "delete",
	label: { en: "Delete", ja: "削除" },
	category: "edit",
	shortcuts: {
		default: [{ code: "Delete" }, { code: "Backspace" }],
	},

	canExecute: (state, registries) => {
		// A vertex selection only claims the key where its type registers a
		// deletion for it; otherwise the key belongs to whatever else is selected.
		if (
			state.selectedVertex !== null &&
			canDeleteObjectParts(
				state,
				toVertexPartSelection(state.selectedVertex),
				registries,
			)
		) {
			return true;
		}
		// The same for a part selection: a type that registers a deletion for the
		// selected kind claims the key; one that registers none leaves it to mean
		// what it means for the object as a whole.
		if (
			state.objectPartSelection !== null &&
			canDeleteObjectParts(state, state.objectPartSelection, registries)
		) {
			return true;
		}
		return state.selectedIds.length > 0 || state.selectedConnectorId !== null;
	},

	execute: (state, registries) => {
		// When a selectedVertex exists, prioritize vertex deletion.
		// Even if selectedIds still contains objects, return from this branch so we
		// don't fall through to object deletion: a selection the type cannot act on
		// is only cleared.
		if (state.selectedVertex !== null) {
			return (
				deleteObjectParts(
					state,
					toVertexPartSelection(state.selectedVertex),
					registries,
					clearSelectedVertex,
				) ?? clearSelectedVertex(state)
			);
		}

		// A part selection whose type deletes that kind is handled there and stops.
		// Unlike the vertex branch this falls through when the type registers no
		// deletion, which is what keeps Delete over a text slot deleting the shape
		// the slot belongs to.
		if (state.objectPartSelection !== null) {
			const deleted = deleteObjectParts(
				state,
				state.objectPartSelection,
				registries,
				clearObjectPartSelection,
			);
			if (deleted !== null) {
				return deleted;
			}
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
		const stateAfterConnectors = cleanupConnectorsOnDelete(
			state,
			idsToDelete,
			registries,
		);

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
			stencilLibraryOpenCategory: null,
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
