import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { getPathFromRoot } from "../getPathFromRoot";

describe("getPathFromRoot", () => {
	const objects: Record<string, ObjectState> = {
		rootA: { id: "rootA", parentId: undefined } as ObjectState,
		group1: { id: "group1", parentId: "rootA" } as ObjectState,
		rect1: { id: "rect1", parentId: "group1" } as ObjectState,
		rootB: { id: "rootB", parentId: undefined } as ObjectState,
	};

	it("should return the correct path for widely nested objects", () => {
		expect(getPathFromRoot("rect1", objects)).toEqual([
			"rootA",
			"group1",
			"rect1",
		]);
	});

	it("should return only itself when the object is at the root", () => {
		expect(getPathFromRoot("rootA", objects)).toEqual(["rootA"]);
	});

	it("should handle unknown IDs gracefully by returning just the targetId", () => {
		expect(getPathFromRoot("unknownId", objects)).toEqual(["unknownId"]);
	});
});
