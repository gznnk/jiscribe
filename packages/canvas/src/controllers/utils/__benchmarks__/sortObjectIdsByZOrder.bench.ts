import { bench, describe } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { getPathFromRoot } from "../getPathFromRoot";
import { sortObjectIdsByZOrder } from "../sortObjectIdsByZOrder";

// --- naive implementation (before Map optimization) ---
function sortObjectIdsByZOrderNaive(
	ids: string[],
	objects: Record<string, ObjectState>,
	rootIds: string[],
): string[] {
	return [...ids].sort((idA, idB) => {
		const pathA = getPathFromRoot(idA, objects);
		const pathB = getPathFromRoot(idB, objects);
		const minPathLength = Math.min(pathA.length, pathB.length);

		for (let depthIndex = 0; depthIndex < minPathLength; depthIndex++) {
			const nodeIdA = pathA[depthIndex];
			const nodeIdB = pathB[depthIndex];

			if (nodeIdA !== nodeIdB) {
				if (depthIndex === 0) {
					return rootIds.indexOf(nodeIdA) - rootIds.indexOf(nodeIdB);
				}
				const commonParentId = pathA[depthIndex - 1];
				const commonParentGroup = objects[commonParentId] as GroupState;
				return (
					commonParentGroup.childIds.indexOf(nodeIdA) -
					commonParentGroup.childIds.indexOf(nodeIdB)
				);
			}
		}
		return pathA.length - pathB.length;
	});
}

// --- Map indexOf optimization only (before path cache) ---
function sortObjectIdsByZOrderMapOnly(
	ids: string[],
	objects: Record<string, ObjectState>,
	rootIds: string[],
): string[] {
	const rootIndexMap = new Map(rootIds.map((id, i) => [id, i]));
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

	return [...ids].sort((idA, idB) => {
		// No path cache: recompute getPathFromRoot on every comparison
		const pathA = getPathFromRoot(idA, objects);
		const pathB = getPathFromRoot(idB, objects);
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

// --- test data builders ---

/** Flat structure: n objects all at the root level */
function buildFlat(n: number): {
	ids: string[];
	objects: Record<string, ObjectState>;
	rootIds: string[];
} {
	const objects: Record<string, ObjectState> = {};
	const rootIds: string[] = [];
	for (let i = 0; i < n; i++) {
		const id = `obj${i}`;
		objects[id] = { id, type: "rect", parentId: undefined } as ObjectState;
		rootIds.push(id);
	}
	// Reversed (worst case)
	return { ids: [...rootIds].reverse(), objects, rootIds };
}

/** Two levels: one group with n children */
function buildNested(n: number): {
	ids: string[];
	objects: Record<string, ObjectState>;
	rootIds: string[];
} {
	const objects: Record<string, ObjectState> = {};
	const childIds: string[] = [];

	for (let i = 0; i < n; i++) {
		const id = `child${i}`;
		objects[id] = { id, type: "rect", parentId: "group0" } as ObjectState;
		childIds.push(id);
	}
	objects["group0"] = {
		id: "group0",
		type: "group",
		parentId: undefined,
		childIds,
	} as unknown as GroupState;

	const rootIds = ["group0"];
	// Reversed (worst case)
	return { ids: [...childIds].reverse(), objects, rootIds };
}

/** Deep nesting: a group chain of `depth` levels with n leaves hung off the deepest level */
function buildDeep(
	n: number,
	depth: number,
): {
	ids: string[];
	objects: Record<string, ObjectState>;
	rootIds: string[];
} {
	const objects: Record<string, ObjectState> = {};

	// Build a single chain group0 -> group1 -> ... -> group{depth-1}
	for (let d = 0; d < depth; d++) {
		const id = `group${d}`;
		objects[id] = {
			id,
			type: "group",
			parentId: d === 0 ? undefined : `group${d - 1}`,
			childIds: [d === depth - 1 ? "" : `group${d + 1}`],
		} as unknown as GroupState;
	}

	const deepestGroupId = `group${depth - 1}`;
	const childIds: string[] = [];
	for (let i = 0; i < n; i++) {
		const id = `leaf${i}`;
		objects[id] = {
			id,
			type: "rect",
			parentId: deepestGroupId,
		} as ObjectState;
		childIds.push(id);
	}
	(objects[deepestGroupId] as unknown as GroupState).childIds = childIds;

	const rootIds = ["group0"];
	// Reversed (worst case)
	return { ids: [...childIds].reverse(), objects, rootIds };
}

// --- benchmarks ---

describe("sortObjectIdsByZOrder — フラット構造", () => {
	const small = buildFlat(50);
	const medium = buildFlat(200);
	const large = buildFlat(1000);

	bench("naive  50 objects", () => {
		sortObjectIdsByZOrderNaive(small.ids, small.objects, small.rootIds);
	});
	bench("Map    50 objects", () => {
		sortObjectIdsByZOrder(small.ids, small.objects, small.rootIds);
	});

	bench("naive  200 objects", () => {
		sortObjectIdsByZOrderNaive(medium.ids, medium.objects, medium.rootIds);
	});
	bench("Map    200 objects", () => {
		sortObjectIdsByZOrder(medium.ids, medium.objects, medium.rootIds);
	});

	bench("naive  1000 objects", () => {
		sortObjectIdsByZOrderNaive(large.ids, large.objects, large.rootIds);
	});
	bench("Map    1000 objects", () => {
		sortObjectIdsByZOrder(large.ids, large.objects, large.rootIds);
	});
});

describe("sortObjectIdsByZOrder — ネスト構造", () => {
	const small = buildNested(50);
	const medium = buildNested(200);
	const large = buildNested(1000);

	bench("naive  50 children", () => {
		sortObjectIdsByZOrderNaive(small.ids, small.objects, small.rootIds);
	});
	bench("Map    50 children", () => {
		sortObjectIdsByZOrder(small.ids, small.objects, small.rootIds);
	});

	bench("naive  200 children", () => {
		sortObjectIdsByZOrderNaive(medium.ids, medium.objects, medium.rootIds);
	});
	bench("Map    200 children", () => {
		sortObjectIdsByZOrder(medium.ids, medium.objects, medium.rootIds);
	});

	bench("naive  1000 children", () => {
		sortObjectIdsByZOrderNaive(large.ids, large.objects, large.rootIds);
	});
	bench("Map    1000 children", () => {
		sortObjectIdsByZOrder(large.ids, large.objects, large.rootIds);
	});
});

describe("sortObjectIdsByZOrder — 深いネスト構造（パスキャッシュ効果）", () => {
	// The deeper the depth, the more getPathFromRoot costs, so the path cache pays off
	const small = buildDeep(50, 10);
	const medium = buildDeep(200, 10);
	const large = buildDeep(1000, 10);

	bench("Map(path再計算)  50 leaves / depth 10", () => {
		sortObjectIdsByZOrderMapOnly(small.ids, small.objects, small.rootIds);
	});
	bench("Map(pathキャッシュ) 50 leaves / depth 10", () => {
		sortObjectIdsByZOrder(small.ids, small.objects, small.rootIds);
	});

	bench("Map(path再計算)  200 leaves / depth 10", () => {
		sortObjectIdsByZOrderMapOnly(medium.ids, medium.objects, medium.rootIds);
	});
	bench("Map(pathキャッシュ) 200 leaves / depth 10", () => {
		sortObjectIdsByZOrder(medium.ids, medium.objects, medium.rootIds);
	});

	bench("Map(path再計算)  1000 leaves / depth 10", () => {
		sortObjectIdsByZOrderMapOnly(large.ids, large.objects, large.rootIds);
	});
	bench("Map(pathキャッシュ) 1000 leaves / depth 10", () => {
		sortObjectIdsByZOrder(large.ids, large.objects, large.rootIds);
	});
});
