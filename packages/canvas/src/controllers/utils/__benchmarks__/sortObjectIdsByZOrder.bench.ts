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

// --- test data builders ---

/** フラット構造: すべてルートレベルに n 個のオブジェクト */
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
	// 逆順（ワーストケース）
	return { ids: [...rootIds].reverse(), objects, rootIds };
}

/** 2階層: 1つのグループに n 個の子 */
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
	// 逆順（ワーストケース）
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
