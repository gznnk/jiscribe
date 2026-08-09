import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { ObjectMapperRegistry } from "../../../../../../states/registry/ObjectMapperRegistry";
import { isConnectableObject } from "../../../../../utils/isConnectableObject";
import type { HoveredElement } from "../../../../recognizer/GestureRecognizerTypes";

/**
 * Returns the first hovered object that is a valid endpoint connection target.
 * - Only objects whose type declares connectable are considered.
 *
 * The object identical to the fixed-side endpoint is also included as a target (to allow
 * self-loops). Avoiding "the same anchor as the fixed side" on the same object is handled
 * by computeEditedEndpoint.
 *
 * @param args.hovered - Elements under the cursor, front-most first; the first
 *   connectable one wins, so a non-connectable shape on top does not shadow it
 * @param args.objects - The canvas's object map, used to resolve the hovered ids
 * @param args.objectMapperRegistry - Registry the `connectable` feature is read from
 * @returns The winning target and its id, or null when nothing hovered qualifies
 */
export function findConnectableHoverTarget(args: {
	hovered: HoveredElement[];
	objects: Record<string, ObjectState>;
	objectMapperRegistry: Pick<ObjectMapperRegistry, "getFeatures">;
}): { id: string; object: ObjectState } | null {
	const { hovered, objects, objectMapperRegistry } = args;

	for (const { id } of hovered) {
		const object = objects[id];
		if (!object) {
			continue;
		}

		if (isConnectableObject(object, objectMapperRegistry)) {
			return { id, object };
		}
	}

	return null;
}
