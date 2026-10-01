import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ICanvasRegistries } from "../../registries/ICanvasRegistries";
import { VERTEX_PART_KIND } from "../../selection/createVertexPartKindDefinition";
import type { ObjectPartTarget } from "../../selection/deleteObjectParts";
import {
	canDeleteObjectParts,
	deleteObjectParts,
} from "../../selection/deleteObjectParts";
import { cleanupConnectorsOnDelete } from "../../utils/cleanupConnectorsOnDelete";
import { cleanupGroups } from "../../utils/cleanupGroups";
import { updateGroupBoundsFromRoot } from "../../utils/updateGroupBoundsFromRoot";
import type { ExecutableCommand } from "../CommandTypes";

/** Reads the legacy single-vertex field as the deletion target the registry takes. */
const toVertexPartTarget = (
	selectedVertex: NonNullable<CanvasControllerState["selectedVertex"]>,
): ObjectPartTarget => ({
	objectId: selectedVertex.objectId,
	kind: VERTEX_PART_KIND,
	partIds: [String(selectedVertex.vertexIndex)],
});

const clearSelectedVertex = (
	state: CanvasControllerState,
): CanvasControllerState => ({ ...state, selectedVertex: null });

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
				toVertexPartTarget(state.selectedVertex),
				registries,
			)
		) {
			return true;
		}
		return state.selectedIds.length > 0 || state.selectedConnectorId !== null;
	},

	execute: (state, registries) => {
		// A vertex selection is tried first. Where its type has no deletion for it,
		// or the index has gone stale, the selection is dropped and the key goes on
		// to whatever else is selected — the answer canExecute already gave for
		// that state, which must not be a key swallowed over a cleared highlight.
		if (state.selectedVertex !== null) {
			const afterParts = deleteObjectParts(
				state,
				toVertexPartTarget(state.selectedVertex),
				registries,
				clearSelectedVertex,
			);
			if (afterParts !== null) {
				return afterParts;
			}
			return deleteSelectedObjects(clearSelectedVertex(state), registries);
		}
		return deleteSelectedObjects(state, registries);
	},
};

/**
 * Removes the selected objects (a group with its descendants) and the selected
 * connector, cleaning up the connectors and groups that referred to them.
 */
const deleteSelectedObjects = (
	state: CanvasControllerState,
	registries: ICanvasRegistries,
): CanvasControllerState => {
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
		rootIds: stateAfterConnectors.rootIds.filter((id) => !idsToDelete.has(id)),
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
};
