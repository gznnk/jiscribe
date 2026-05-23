import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Returns the ancestor chain of an object from innermost (immediate parent) to outermost (root).
 * The object itself is NOT included; only its ancestors.
 */
function getAncestorChainInner(
	id: string,
	objects: Record<string, ObjectState>,
): string[] {
	const chain: string[] = [];
	const visited = new Set<string>();
	let currentId: string | undefined = id;

	while (currentId) {
		const obj: ObjectState | undefined = objects[currentId];
		if (!obj?.parentId) break;
		if (visited.has(obj.parentId)) {
			console.warn(`[findLowestCommonAncestor] Circular reference at "${obj.parentId}"`);
			break;
		}
		chain.push(obj.parentId);
		visited.add(currentId);
		currentId = obj.parentId;
	}

	return chain; // [immediate parent, ..., root]
}

/**
 * Returns true if `descendantId` is a descendant of (or equal to) `ancestorId`.
 */
function isDescendantOf(
	descendantId: string,
	ancestorId: string,
	objects: Record<string, ObjectState>,
): boolean {
	const visited = new Set<string>();
	let currentId: string | undefined = descendantId;

	while (currentId) {
		if (currentId === ancestorId) return true;
		if (visited.has(currentId)) break;
		visited.add(currentId);
		const obj: ObjectState | undefined = objects[currentId];
		currentId = obj?.parentId;
	}

	return false;
}

/**
 * Finds the Lowest Common Ancestor (LCA) group of a set of object IDs.
 *
 * Returns the deepest group that is an ancestor of every object in `ids`.
 * If the objects have no common ancestor group (they all live at root level),
 * returns `undefined`.
 *
 * @param ids - The object IDs to find LCA for (must have ≥ 2 elements)
 * @param objects - The full object map
 * @returns The ID of the LCA group, or `undefined` if there is none
 */
export function findLowestCommonAncestor(
	ids: string[],
	objects: Record<string, ObjectState>,
): string | undefined {
	if (ids.length === 0) return undefined;

	// Get ancestor chain of first ID (innermost to outermost)
	const candidateChain = getAncestorChainInner(ids[0], objects);

	// Walk candidates from innermost outward and find the first one that is
	// an ancestor of ALL other ids
	for (const candidate of candidateChain) {
		const allDescend = ids.every((id) =>
			isDescendantOf(id, candidate, objects),
		);
		if (allDescend) return candidate;
	}

	return undefined;
}
