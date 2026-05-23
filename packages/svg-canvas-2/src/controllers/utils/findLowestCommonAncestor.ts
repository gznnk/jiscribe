import type { ObjectState } from "../../states/objects/base/ObjectState";

function getAncestorChain(id: string, objects: Record<string, ObjectState>): string[] {
	const chain: string[] = [];
	let currentId = objects[id]?.parentId;
	while (currentId != null) {
		chain.push(currentId);
		currentId = objects[currentId]?.parentId;
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
	if (ids.length === 0) return undefined;

	// Start with the ancestor chain of the first ID, then narrow it down
	// by intersecting with the ancestor chain of each subsequent ID.
	let candidates = getAncestorChain(ids[0], objects);
	for (let i = 1; i < ids.length; i++) {
		const ancestorSet = new Set(getAncestorChain(ids[i], objects));
		candidates = candidates.filter((id) => ancestorSet.has(id));
	}
	return candidates[0]; // innermost common ancestor
}
