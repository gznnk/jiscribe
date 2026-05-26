import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Retrieves the chain of ancestor IDs for a given object.
 * The returned array is ordered from the immediate parent up to the root ancestor.
 *
 * @param id - The ID of the target object.
 * @param objects - A record mapping object IDs to their respective state.
 * @returns An array of ancestor IDs: `[immediateParentId, ..., rootId]`.
 */
function getAncestorChain(
	id: string,
	objects: Record<string, ObjectState>,
): string[] {
	const chain: string[] = [];
	let currentParentId = objects[id]?.parentId;
	while (currentParentId != null) {
		chain.push(currentParentId);
		currentParentId = objects[currentParentId]?.parentId;
	}
	return chain; // [immediate parent, ..., root]
}

/**
 * Returns the deepest group that is an ancestor of every object in `ids`,
 * or `undefined` if no common ancestor group exists.
 */
export function findLowestCommonAncestor(
	ids: string[],
	objects: Record<string, ObjectState>,
): string | undefined {
	if (ids.length === 0) {
		return undefined;
	}

	// Start with the ancestor chain of the first ID, then narrow it down
	// by intersecting with the ancestor chain of each subsequent ID.
	let candidates = getAncestorChain(ids[0], objects);
	for (let i = 1; i < ids.length; i++) {
		const ancestorSet = new Set(getAncestorChain(ids[i], objects));
		candidates = candidates.filter((id) => ancestorSet.has(id));
	}
	return candidates[0]; // innermost common ancestor
}
