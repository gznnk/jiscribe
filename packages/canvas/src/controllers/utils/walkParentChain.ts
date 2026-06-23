import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Walks up the parent chain from the given object and returns the ancestor IDs
 * ordered from the immediate parent up to the root ancestor.
 *
 * The starting object's own ID is NOT included in the result.
 *
 * The parent chain is a validated tree (acyclic) by the time it reaches internal
 * code, so traversal terminates at the root (`parentId == null`) without a cycle
 * guard.
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

	let currentParentId = objects[startId]?.parentId;
	while (currentParentId != null) {
		chain.push(currentParentId);
		currentParentId = objects[currentParentId]?.parentId;
	}

	return chain; // [immediate parent, ..., root]
}
