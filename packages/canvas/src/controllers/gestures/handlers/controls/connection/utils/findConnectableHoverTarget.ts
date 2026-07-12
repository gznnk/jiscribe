import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { HoveredElement } from "../../../../recognizer/GestureRecognizerTypes";

/**
 * Returns the first hovered object that is a valid endpoint connection target.
 * - Only objects whose stamped features declare connectable are considered.
 *
 * The object identical to the fixed-side endpoint is also included as a target (to allow
 * self-loops). Avoiding "the same anchor as the fixed side" on the same object is handled
 * by computeEditedEndpoint.
 */
export function findConnectableHoverTarget(args: {
	hovered: HoveredElement[];
	objects: Record<string, ObjectState>;
}): { id: string; object: ObjectState } | null {
	const { hovered, objects } = args;

	for (const { id } of hovered) {
		const object = objects[id];
		if (!object) {
			continue;
		}

		if (object.features?.connectable === true) {
			return { id, object };
		}
	}

	return null;
}
