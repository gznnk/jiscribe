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

	// head インデックス方式で BFS する。queue.shift() は配列全体を前詰めするため
	// 1 回 O(n)（全体で O(n^2)）になるが、head を進めるだけなら全体で O(n) に収まる。
	// autoSelectParentGroups と同一パターン。
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
