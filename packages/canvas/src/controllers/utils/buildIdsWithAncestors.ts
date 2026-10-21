import { walkParentChain } from "./walkParentChain";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Builds a Set containing the given IDs plus every group above them — what the
 * render gate (ObjectsRenderer) has to let through for exactly these objects to
 * be drawn, since it stops a group's whole subtree at the group.
 *
 * @param ids - IDs of the objects to keep; missing ones are kept as they are and
 *   contribute no ancestor
 * @param objects - Flat object map
 */
export function buildIdsWithAncestors(
	ids: Iterable<string>,
	objects: Record<string, ObjectState>,
): ReadonlySet<string> {
	const result = new Set<string>();
	for (const id of ids) {
		result.add(id);
		for (const ancestorId of walkParentChain(id, objects)) {
			result.add(ancestorId);
		}
	}
	return result;
}
