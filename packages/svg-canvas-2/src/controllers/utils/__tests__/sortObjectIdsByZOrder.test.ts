import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { sortObjectIdsByZOrder } from "../sortObjectIdsByZOrder";

describe("sortObjectIdsByZOrder", () => {
	it("should sort objects by their accurate z-order based on tree hierarchy", () => {
		// tree struct:
		// rootIds: [group1, rect4]
		// group1 -> [group2, group3]
		// group2 -> [rect1, rect2]
		// group3 -> [rect3]

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

		// 同一の親を持つ場合 (Same parent)
		expect(sortObjectIdsByZOrder(["rect2", "rect1"], objects, rootIds)).toEqual(
			["rect1", "rect2"],
		);

		// 同一の祖先を持つ別のグループ配下 (Different groups under same parent)
		expect(sortObjectIdsByZOrder(["rect3", "rect1"], objects, rootIds)).toEqual(
			["rect1", "rect3"],
		);

		// 異なるルート要素間の比較 (Different roots)
		expect(sortObjectIdsByZOrder(["rect4", "rect2"], objects, rootIds)).toEqual(
			["rect2", "rect4"],
		);

		// 構造が入り乱れているケースのソート (Mixed including groups)
		expect(
			sortObjectIdsByZOrder(
				["rect4", "group1", "rect3", "group2", "rect1"],
				objects,
				rootIds,
			),
		).toEqual(["group1", "group2", "rect1", "rect3", "rect4"]);
	});
});
