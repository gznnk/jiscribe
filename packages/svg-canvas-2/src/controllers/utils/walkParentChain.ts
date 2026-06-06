import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Walks up the parent chain from the given object and returns the ancestor IDs
 * ordered from the immediate parent up to the root ancestor.
 *
 * The starting object's own ID is NOT included in the result.
 *
 * Circular references (self-reference such as `A.parentId === A`, or short
 * cycles such as `A.parentId === B`, `B.parentId === A`) are detected via a
 * visited set: traversal stops and a warning is emitted instead of looping
 * forever.
 *
 * @param startId - ID of the object whose ancestors are collected.
 * @param objects - Flat map of all object states.
 * @returns Ancestor IDs `[immediateParentId, ..., rootId]`.
 */
export function walkParentChain(
	startId: string,
	objects: Record<string, ObjectState>,
): string[] {
	const chain: string[] = [];
	const visited = new Set<string>([startId]);

	let currentParentId = objects[startId]?.parentId;
	while (currentParentId != null) {
		if (visited.has(currentParentId)) {
			console.warn(
				`[walkParentChain] Circular reference detected at "${currentParentId}"`,
			);
			break;
		}
		visited.add(currentParentId);
		chain.push(currentParentId);
		currentParentId = objects[currentParentId]?.parentId;
	}

	return chain; // [immediate parent, ..., root]
}
