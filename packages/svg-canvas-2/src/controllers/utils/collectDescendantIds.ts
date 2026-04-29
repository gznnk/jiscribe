import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * Recursively collects all descendant IDs for a given object ID.
 *
 * @param id - The root object ID to start from
 * @param objects - Flat map of all objects
 * @param result - Accumulator array (used internally for recursion)
 * @returns Array of all descendant IDs (not including the root ID itself)
 */
export function collectDescendantIds(
	id: string,
	objects: Record<string, ObjectState>,
	result: string[] = [],
): string[] {
	const obj = objects[id];
	if (!obj || !isGroupState(obj)) return result;
	for (const childId of obj.childIds) {
		result.push(childId);
		collectDescendantIds(childId, objects, result);
	}
	return result;
}
