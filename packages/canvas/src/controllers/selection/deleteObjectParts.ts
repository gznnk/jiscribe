import type { CanvasControllerState } from "../CanvasTypes";
import type { ICanvasRegistries } from "../registries/ICanvasRegistries";
import { updateGroupBoundsFromRoot } from "../utils/updateGroupBoundsFromRoot";

/**
 * The parts `deleteObjectParts` / `canDeleteObjectParts` are asked to remove,
 * named inside one object. It is the request rather than the selection: how the
 * ids were arrived at is none of its business, and the object type owns both the
 * `kind` namespace and the meaning of each id.
 */
export type ObjectPartTarget = {
	/** The object the parts belong to; every part id is resolved against it alone. */
	objectId: string;
	/** Part-id namespace owned by the object type: "textSlot", "vertex", "cell". */
	kind: string;
	/** Non-empty, in the type's own order. Core neither sorts nor dedups. */
	partIds: readonly string[];
};

/** The registry slice the part-deletion seam reads. */
type PartRegistries = Pick<ICanvasRegistries, "objectPart">;

/**
 * Whether the target's object type registers a deletion for that kind of part.
 * Commands ask before reporting themselves executable: a type with no `delete`
 * would otherwise swallow the key and do nothing.
 *
 * @param state - The state the target is resolved against
 * @param target - The parts to delete; only `objectId` and `kind` are read
 * @param registries - The bundle holding `objectPart`
 * @returns False when the object is gone or its type declares no such deletion
 */
export const canDeleteObjectParts = (
	state: CanvasControllerState,
	target: ObjectPartTarget,
	registries: PartRegistries,
): boolean => {
	const object = state.objects[target.objectId];
	if (!object) {
		return false;
	}
	return (
		registries.objectPart.get(object.type, target.kind)?.delete !== undefined
	);
};

/**
 * Deletes sub-parts of a single object through its type's part definition,
 * committing the result as a one-shot command edit (plain spread of the objects
 * map, no copy-on-write view).
 *
 * @param state - The state to build the next one from
 * @param target - The parts to delete, in the type's own part-id namespace
 * @param registries - The bundle holding `objectPart`
 * @param clearPartSelection - Blanks the state field this target was read from;
 *   core keeps no single part-selection channel yet, so the field is the
 *   caller's to name
 * @returns The state to commit — `state` itself when the type refused the
 *   deletion — or null when nothing is registered to delete this kind of part
 *   or the target has gone stale, leaving the caller to decide what the
 *   keystroke means instead
 */
export const deleteObjectParts = (
	state: CanvasControllerState,
	target: ObjectPartTarget,
	registries: PartRegistries,
	clearPartSelection: (state: CanvasControllerState) => CanvasControllerState,
): CanvasControllerState | null => {
	const object = state.objects[target.objectId];
	if (!object) {
		return null;
	}

	const part = registries.objectPart.get(object.type, target.kind);
	if (!part?.delete) {
		return null;
	}
	if (!target.partIds.every((partId) => part.has(object, partId))) {
		return null;
	}

	const deletedObject = part.delete(object, target.partIds);
	if (deletedObject === null) {
		return state;
	}

	const nextState: CanvasControllerState = clearPartSelection({
		...state,
		objects: {
			...state.objects,
			[target.objectId]: deletedObject,
		},
		lastDuplicate: null,
		commitVersion: state.commitVersion + 1,
	});

	return deletedObject.parentId
		? updateGroupBoundsFromRoot(nextState, deletedObject.parentId)
		: nextState;
};
