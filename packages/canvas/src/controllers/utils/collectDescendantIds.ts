import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * Collects all descendant IDs for a given object ID using BFS.
 * Circular references in the hierarchy are detected and skipped with a warning.
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
	const visited = new Set([id]);
	const queue = [id];

	while (queue.length > 0) {
		const currentId = queue.shift()!;
		const obj = objects[currentId];
		if (!obj || !isGroupState(obj)) {
			continue;
		}

		for (const childId of obj.childIds) {
			if (visited.has(childId)) {
				console.warn(
					`[collectDescendantIds] Circular reference detected at "${childId}"`,
				);
				continue;
			}
			visited.add(childId);
			result.push(childId);
			queue.push(childId);
		}
	}

	return result;
}
