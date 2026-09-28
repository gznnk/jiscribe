import type { ObjectPartSelection } from "./ObjectPartSelection";
import type { CanvasControllerState } from "../CanvasTypes";
import type { ICanvasRegistries } from "../registries/ICanvasRegistries";
import { updateGroupBoundsFromRoot } from "../utils/updateGroupBoundsFromRoot";

/** The registry slice the part-deletion seam reads. */
type PartRegistries = Pick<ICanvasRegistries, "objectPart">;

/**
 * Whether the selection's object type registers a deletion for that kind of
 * part. Commands ask before reporting themselves executable: a type with no
 * `delete` would otherwise swallow the key and do nothing.
 *
 * @param state - The state the selection is resolved against
 * @param selection - The parts to delete; only `objectId` and `kind` are read
 * @param registries - The bundle holding `objectPart`
 * @returns False when the object is gone or its type declares no such deletion
 */
export const canDeleteObjectParts = (
	state: CanvasControllerState,
	selection: ObjectPartSelection,
	registries: PartRegistries,
): boolean => {
	const object = state.objects[selection.objectId];
	if (!object) {
		return false;
	}
	return (
		registries.objectPart.get(object.type, selection.kind)?.delete !== undefined
	);
};

/**
 * Deletes sub-parts of a single object through its type's part definition,
 * committing the result as a one-shot command edit (plain spread of the objects
 * map, no copy-on-write view).
 *
 * @param state - The state to build the next one from
 * @param selection - The parts to delete, in the type's own part-id namespace
 * @param registries - The bundle holding `objectPart`
 * @param clearPartSelection - Blanks the state field this selection was read
 *   from; a selection reaches here either from the generic part channel or from
 *   a legacy per-kind field, so the field is the caller's to name
 * @returns The state to commit — `state` itself when the type refused the
 *   deletion — or null when nothing is registered to delete this kind of part
 *   or the selection has gone stale, leaving the caller to decide what the
 *   keystroke means instead
 */
export const deleteObjectParts = (
	state: CanvasControllerState,
	selection: ObjectPartSelection,
	registries: PartRegistries,
	clearPartSelection: (state: CanvasControllerState) => CanvasControllerState,
): CanvasControllerState | null => {
	const object = state.objects[selection.objectId];
	if (!object) {
		return null;
	}

	const part = registries.objectPart.get(object.type, selection.kind);
	if (!part?.delete) {
		return null;
	}
	if (!selection.partIds.every((partId) => part.has(object, partId))) {
		return null;
	}

	const deletedObject = part.delete(object, selection.partIds);
	if (deletedObject === null) {
		return state;
	}

	const nextState: CanvasControllerState = clearPartSelection({
		...state,
		objects: {
			...state.objects,
			[selection.objectId]: deletedObject,
		},
		lastDuplicate: null,
		commitVersion: state.commitVersion + 1,
	});

	return deletedObject.parentId
		? updateGroupBoundsFromRoot(nextState, deletedObject.parentId)
		: nextState;
};
