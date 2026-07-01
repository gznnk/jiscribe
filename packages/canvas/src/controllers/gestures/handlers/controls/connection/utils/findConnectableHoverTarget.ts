import type { ObjectType } from "../../../../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { HoveredElement } from "../../../../recognizer/GestureRecognizerTypes";

/**
 * Returns the first hovered object that is a valid endpoint connection target.
 * - Only objects for which the connectable check (isConnectable) is true are considered.
 *
 * The object identical to the fixed-side endpoint is also included as a target (to allow
 * self-loops). Avoiding "the same anchor as the fixed side" on the same object is handled
 * by computeEditedEndpoint.
 *
 * By injecting isConnectable instead of depending on the registry directly, this stays a
 * pure function and can be unit tested.
 */
export function findConnectableHoverTarget(args: {
	hovered: HoveredElement[];
	objects: Record<string, ObjectState>;
	isConnectable: (type: ObjectType) => boolean;
}): { id: string; object: ObjectState } | null {
	const { hovered, objects, isConnectable } = args;

	for (const { id } of hovered) {
		const object = objects[id];
		if (!object) {
			continue;
		}

		if (isConnectable(object.type)) {
			return { id, object };
		}
	}

	return null;
}
