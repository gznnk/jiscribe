import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ICanvasRegistries } from "../../registries/ICanvasRegistries";
import type { ObjectPartKindDefinition } from "../partKinds/ObjectPartKindRegistry";

/**
 * The parts a deletion is asked to remove, named inside one object. It is the
 * request rather than the selection: how the ids were arrived at is none of its
 * business, and the object type owns both the `kind` namespace and the meaning
 * of each id.
 */
export type DeletableParts = {
	/** The object the parts belong to; every part id is resolved against it alone. */
	objectId: string;
	/** Part-id namespace owned by the object type: "textSlot", "vertex", "cell". */
	kind: string;
	/** Non-empty, in the type's own order. Core neither sorts nor dedups. */
	partIds: readonly string[];
};

/** The registry slice the part-deletion seam reads. */
type PartRegistries = Pick<ICanvasRegistries, "objectPartKind">;

/** A definition whose `delete` the caller can reach without guarding it again. */
type DeletablePartKindDefinition = ObjectPartKindDefinition & {
	delete: NonNullable<ObjectPartKindDefinition["delete"]>;
};

const hasDeletion = (
	part: ObjectPartKindDefinition,
): part is DeletablePartKindDefinition => part.delete !== undefined;

/**
 * The parts a deletion may act on, read from the target: the object it names,
 * and the definition registered for the kind, with every id checked against `has`
 * — the gate the `delete` contract ("every id has passed `has`") is kept at.
 * Null when the object is gone, the kind registers no deletion, or an id no longer
 * names a part; the caller then treats the key as the selected objects' own.
 *
 * @param state - The state the target is resolved against
 * @param target - The parts to delete, in the type's own part-id namespace
 * @param registries - The bundle holding `objectPartKind`
 * @returns The object and the definition whose `delete` applies to it, or null
 */
export const readDeletableParts = (
	state: CanvasControllerState,
	target: DeletableParts,
	registries: PartRegistries,
): { object: ObjectState; part: DeletablePartKindDefinition } | null => {
	const object = state.objects[target.objectId];
	if (!object) {
		return null;
	}

	const part = registries.objectPartKind.get(object.type, target.kind);
	if (!part || !hasDeletion(part)) {
		return null;
	}
	if (!target.partIds.every((partId) => part.has(object, partId))) {
		return null;
	}

	return { object, part };
};
