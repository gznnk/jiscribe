import { walkParentChain } from "./walkParentChain";
import type { ObjectState } from "../../states/objects/base/ObjectState";

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
	let candidates = walkParentChain(ids[0], objects);
	for (let i = 1; i < ids.length; i++) {
		const ancestorSet = new Set(walkParentChain(ids[i], objects));
		candidates = candidates.filter((id) => ancestorSet.has(id));
	}
	return candidates[0]; // innermost common ancestor
}
