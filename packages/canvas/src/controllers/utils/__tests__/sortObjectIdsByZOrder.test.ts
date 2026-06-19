import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { sortObjectIdsByZOrder } from "../sortObjectIdsByZOrder";

/**
 * Test tree:
 *   rootIds: [group1, rect4]
 *   group1 (group)
 *     group2 (group)
 *       rect1
 *       rect2
 *     group3 (group)
 *       rect3
 *   rect4
 */
const objects: Record<string, ObjectState> = {
	group1: {
		id: "group1",
		type: "group",
		parentId: undefined,
		childIds: ["group2", "group3"],
	} as unknown as GroupState,
	group2: {
		id: "group2",
		type: "group",
		parentId: "group1",
		childIds: ["rect1", "rect2"],
	} as unknown as GroupState,
	rect1: { id: "rect1", parentId: "group2" } as ObjectState,
	rect2: { id: "rect2", parentId: "group2" } as ObjectState,
	group3: {
		id: "group3",
		type: "group",
		parentId: "group1",
		childIds: ["rect3"],
	} as unknown as GroupState,
	rect3: { id: "rect3", parentId: "group3" } as ObjectState,
	rect4: { id: "rect4", parentId: undefined } as ObjectState,
};
const rootIds = ["group1", "rect4"];

describe("sortObjectIdsByZOrder", () => {
	it("同一の親を持つ兄弟を childIds の順にソートする", () => {
		expect(sortObjectIdsByZOrder(["rect2", "rect1"], objects, rootIds)).toEqual(
			["rect1", "rect2"],
		);
	});

	it("同一の祖先を持つ別グループ配下の要素を正しい順にソートする", () => {
		expect(sortObjectIdsByZOrder(["rect3", "rect1"], objects, rootIds)).toEqual(
			["rect1", "rect3"],
		);
	});

	it("異なるルート要素に属する要素を rootIds の順にソートする", () => {
		expect(sortObjectIdsByZOrder(["rect4", "rect2"], objects, rootIds)).toEqual(
			["rect2", "rect4"],
		);
	});

	it("グループを含む混在リストを階層順にソートする", () => {
		expect(
			sortObjectIdsByZOrder(
				["rect4", "group1", "rect3", "group2", "rect1"],
				objects,
				rootIds,
			),
		).toEqual(["group1", "group2", "rect1", "rect3", "rect4"]);
	});

	it("既にソート済みの場合は順序を変えない", () => {
		const sorted = [
			"group1",
			"group2",
			"rect1",
			"rect2",
			"group3",
			"rect3",
			"rect4",
		];
		expect(sortObjectIdsByZOrder(sorted, objects, rootIds)).toEqual(sorted);
	});

	it("空配列を渡すと空配列を返す", () => {
		expect(sortObjectIdsByZOrder([], objects, rootIds)).toEqual([]);
	});

	it("1要素の配列はそのまま返す", () => {
		expect(sortObjectIdsByZOrder(["rect1"], objects, rootIds)).toEqual([
			"rect1",
		]);
	});

	it("元の配列を破壊しない", () => {
		const input = ["rect4", "rect2", "rect1"];
		const copy = [...input];
		sortObjectIdsByZOrder(input, objects, rootIds);
		expect(input).toEqual(copy);
	});
});
