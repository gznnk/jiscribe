import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ICanvasRegistries } from "../../registries/ICanvasRegistries";
import { EMPTY_SELECTION } from "../../selection/CanvasSelection";
import { collectObjectPartIds } from "../../selection/readers/collectObjectPartIds";
import type { DeletableParts } from "../../selection/readers/readDeletableParts";
import { readDeletableParts } from "../../selection/readers/readDeletableParts";
import { cleanupConnectorsOnDelete } from "../../utils/cleanupConnectorsOnDelete";
import { cleanupGroups } from "../../utils/cleanupGroups";
import { updateGroupBoundsFromRoot } from "../../utils/updateGroupBoundsFromRoot";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * The parts picked one level below the object read as the deletion target the
 * registry takes, every range expanded to the parts it covers; null while
 * nothing is picked there, and while the owner's type declares no such kind.
 * Validity is not asked about: the reducer has already dropped a selection
 * naming something gone (reconcileSelection), so every id here has passed
 * `has`. Whether the parts can be deleted at all is a separate question
 * (readDeletableParts).
 */
const resolveSelectedParts = (
	state: CanvasControllerState,
	registries: Pick<ICanvasRegistries, "objectPartKind">,
): DeletableParts | null => {
	const { objectIds, part } = state.selection;
	if (part === null) {
		return null;
	}
	const owner = state.objects[objectIds[0]];
	if (owner === undefined) {
		return null;
	}
	const definition = registries.objectPartKind.get(owner.type, part.kind);
	if (definition === undefined) {
		return null;
	}
	return {
		objectId: owner.id,
		kind: part.kind,
		partIds: collectObjectPartIds(part, definition, owner),
	};
};

const clearPartSelection = (
	state: CanvasControllerState,
): CanvasControllerState => ({
	...state,
	selection: { ...state.selection, part: null },
});

/**
 * Command that deletes the current selection. Parts picked one level below the
 * object are deleted where their type registers a deletion for the kind; where it
 * registers none (a text slot), the key means what it means for the selected
 * objects, which are removed (a group with its descendants). A kind that wants
 * the key held while one of its parts is
 * picked, yet nothing removed, declares a deletion that refuses
 * (`delete: () => null`).
 */
export const DeleteCommand: ExecutableCommand = {
	id: "delete",
	label: { en: "Delete", ja: "削除" },
	category: "edit",
	shortcuts: {
		default: [{ code: "Delete" }, { code: "Backspace" }],
	},

	canExecute: (state, registries) => {
		// A picked part claims the key where its type registers a deletion for its
		// kind; a kind registering none has said Delete is not about its parts, so
		// the key means what it means for the selected objects.
		const target = resolveSelectedParts(state, registries);
		if (
			target !== null &&
			readDeletableParts(state, target, registries) !== null
		) {
			return true;
		}
		return state.selection.objectIds.length > 0;
	},

	execute: (state, registries) => {
		const target = resolveSelectedParts(state, registries);
		if (target !== null) {
			const deletable = readDeletableParts(state, target, registries);
			if (deletable !== null) {
				const deletedObject = deletable.part.delete(
					deletable.object,
					target.partIds,
				);
				if (deletedObject === null) {
					// The type refused this one deletion (a polyline at its vertex floor):
					// the key stays claimed, yet nothing changes.
					return state;
				}
				return commitPartDeletion(state, deletedObject);
			}
		}
		// Either nothing is picked below the object or the kind registers no
		// deletion: the key is the objects', and the pick goes with them.
		return deleteSelectedObjects(clearPartSelection(state), registries);
	},
};

/**
 * Commits the object the part definition gave back as one command edit (plain
 * spread of the objects map, no copy-on-write view), the counterpart of
 * `deleteSelectedObjects` for the part branch.
 */
const commitPartDeletion = (
	state: CanvasControllerState,
	deletedObject: ObjectState,
): CanvasControllerState => {
	const nextState: CanvasControllerState = {
		...state,
		objects: {
			...state.objects,
			[deletedObject.id]: deletedObject,
		},
		// Removing a part renumbers the ids of a positional kind (the vertices), so
		// the pick is dropped rather than left addressing whoever took the number
		// over (see ObjectPartSelection).
		selection: { ...state.selection, part: null },
		// A deletion is not something a duplicate can be offset from any more.
		lastDuplicate: null,
		commitVersion: state.commitVersion + 1,
	};

	return deletedObject.parentId
		? updateGroupBoundsFromRoot(nextState, deletedObject.parentId)
		: nextState;
};

/**
 * Removes the selected objects (a group with its descendants), cleaning up the
 * connectors and groups that referred to them.
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

	for (const id of state.selection.objectIds) {
		collectIds(id);
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
	for (const id of state.selection.objectIds) {
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
		// (the selected objects and their descendants).
		rootIds: stateAfterConnectors.rootIds.filter((id) => !idsToDelete.has(id)),
		selection: EMPTY_SELECTION,
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
