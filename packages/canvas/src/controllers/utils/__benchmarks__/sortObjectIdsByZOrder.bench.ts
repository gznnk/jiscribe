import { bench, describe } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { sortObjectIdsByZOrder } from "../sortObjectIdsByZOrder";

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

const SIZES = [50, 200, 1000];

describe("sortObjectIdsByZOrder: flat root, ids reversed", () => {
	for (const size of SIZES) {
		const { ids, objects, rootIds } = buildFlat(size);
		bench(`${size} objects`, () => {
			sortObjectIdsByZOrder(ids, objects, rootIds);
		});
	}
});

describe("sortObjectIdsByZOrder: one group, children reversed", () => {
	for (const size of SIZES) {
		const { ids, objects, rootIds } = buildNested(size);
		bench(`${size} children`, () => {
			sortObjectIdsByZOrder(ids, objects, rootIds);
		});
	}
});

// The deeper the leaves, the more each path from the root costs.
describe("sortObjectIdsByZOrder: leaves 10 groups deep, reversed", () => {
	for (const size of SIZES) {
		const { ids, objects, rootIds } = buildDeep(size, 10);
		bench(`${size} leaves`, () => {
			sortObjectIdsByZOrder(ids, objects, rootIds);
		});
	}
});
