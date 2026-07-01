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

	// BFS using a head-index approach. queue.shift() shifts the whole array
	// forward, so it is O(n) per call (O(n^2) overall), whereas just advancing
	// head keeps the total at O(n). Same pattern as autoSelectParentGroups.
	let head = 0;
	while (head < queue.length) {
		const currentId = queue[head];
		head++;
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
