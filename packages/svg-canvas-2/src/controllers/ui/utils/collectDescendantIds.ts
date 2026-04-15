import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { isGroupState } from "../../../states/objects/primitives/group/GroupState";

/**
 * Recursively collects all descendant IDs for a given object ID.
 *
 * @param id - The root object ID to start from
 * @param objects - Flat map of all objects
 * @returns Array of all descendant IDs (not including the root ID itself)
 */
export function collectDescendantIds(
	id: string,
	objects: Record<string, ObjectState>,
): string[] {
	const obj = objects[id];
	if (!obj || !isGroupState(obj)) return [];
	const results: string[] = [];
	for (const childId of obj.childIds) {
		results.push(childId);
		results.push(...collectDescendantIds(childId, objects));
	}
	return results;
}
