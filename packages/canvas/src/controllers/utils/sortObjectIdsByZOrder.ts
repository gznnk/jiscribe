import { getPathFromRoot } from "./getPathFromRoot";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { GroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * Sorts an array of object IDs by their z-order on the canvas (back to front)
 * and returns the result.
 *
 * For each object it obtains the path from the root and compares indices level
 * by level starting from the front (root side), yielding the exact z-order on
 * the canvas.
 *
 * @param ids - The object IDs to sort
 * @param objects - Map of all objects on the canvas
 * @param rootIds - The canvas's list of root IDs
 * @returns The object IDs sorted by z-order
 */
export function sortObjectIdsByZOrder(
	ids: string[],
	objects: Record<string, ObjectState>,
	rootIds: string[],
): string[] {
	const rootIndexMap = new Map(rootIds.map((id, i) => [id, i]));
	// To make indexOf over childIds O(1), build and cache a Map on demand during comparison
	const childIndexCache = new Map<string, Map<string, number>>();

	const getChildIndex = (parentId: string, childId: string): number => {
		let map = childIndexCache.get(parentId);
		if (!map) {
			const group = objects[parentId] as GroupState;
			map = new Map(group.childIds.map((id, i) => [id, i]));
			childIndexCache.set(parentId, map);
		}
		return map.get(childId) ?? -1;
	};

	// The path from root is referenced many times inside the comparator, so
	// compute and cache it once per ID to avoid recomputation and array
	// allocation on every comparison
	const pathCache = new Map<string, string[]>();
	const getPath = (id: string): string[] => {
		let path = pathCache.get(id);
		if (!path) {
			path = getPathFromRoot(id, objects);
			pathCache.set(id, path);
		}
		return path;
	};

	return [...ids].sort((idA, idB) => {
		const pathA = getPath(idA);
		const pathB = getPath(idB);
		const minPathLength = Math.min(pathA.length, pathB.length);

		for (let depthIndex = 0; depthIndex < minPathLength; depthIndex++) {
			const nodeIdA = pathA[depthIndex];
			const nodeIdB = pathB[depthIndex];

			if (nodeIdA !== nodeIdB) {
				if (depthIndex === 0) {
					return (
						(rootIndexMap.get(nodeIdA) ?? -1) -
						(rootIndexMap.get(nodeIdB) ?? -1)
					);
				}
				const commonParentId = pathA[depthIndex - 1];
				return (
					getChildIndex(commonParentId, nodeIdA) -
					getChildIndex(commonParentId, nodeIdB)
				);
			}
		}
		return pathA.length - pathB.length;
	});
}
