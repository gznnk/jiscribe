import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { buildIdsWithAncestors } from "../buildIdsWithAncestors";

const objects = {
	outer: { id: "outer", type: "group", childIds: ["inner"] },
	inner: { id: "inner", type: "group", parentId: "outer", childIds: ["a"] },
	a: { id: "a", type: "rect", parentId: "inner" },
	b: { id: "b", type: "rect" },
} as unknown as Record<string, ObjectState>;

describe("buildIdsWithAncestors", () => {
	it("adds every group above a nested id", () => {
		expect([...buildIdsWithAncestors(["a"], objects)].sort()).toEqual([
			"a",
			"inner",
			"outer",
		]);
	});

	it("adds nothing for a root-level id", () => {
		expect([...buildIdsWithAncestors(["b"], objects)]).toEqual(["b"]);
	});

	it("keeps a missing id as it is", () => {
		expect([...buildIdsWithAncestors(["missing"], objects)]).toEqual([
			"missing",
		]);
	});
});
