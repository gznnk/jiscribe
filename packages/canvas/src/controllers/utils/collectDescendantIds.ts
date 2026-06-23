import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * Collects all descendant IDs for a given object ID using BFS.
 *
 * The object map is a validated tree (ID-unique, acyclic) by the time it reaches
 * internal code, so no cycle guard is needed.
 *
 * @param id - The root object ID to start from
 * @param objects - Flat map of all objects
 * @param result - Accumulator array (for API compatibility)
 * @returns Array of all descendant IDs (not including the root ID itself)
 */
export function collectDescendantIds(
	id: string,
	objects: Record<string, ObjectState>,
	result: string[] = [],
): string[] {
	const queue = [id];

	while (queue.length > 0) {
		const currentId = queue.shift()!;
		const obj = objects[currentId];
		if (!obj || !isGroupState(obj)) {
			continue;
		}

		for (const childId of obj.childIds) {
			result.push(childId);
			queue.push(childId);
		}
	}

	return result;
}
