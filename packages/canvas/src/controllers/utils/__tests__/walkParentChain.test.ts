import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { walkParentChain } from "../walkParentChain";

describe("walkParentChain", () => {
	const objects: Record<string, ObjectState> = {
		root: { id: "root", parentId: undefined } as ObjectState,
		group1: { id: "group1", parentId: "root" } as ObjectState,
		rect1: { id: "rect1", parentId: "group1" } as ObjectState,
	};

	it("returns ancestors ordered from immediate parent up to root", () => {
		expect(walkParentChain("rect1", objects)).toEqual(["group1", "root"]);
	});

	it("returns an empty array for a root-level object", () => {
		expect(walkParentChain("root", objects)).toEqual([]);
	});

	it("returns an empty array for an unknown id", () => {
		expect(walkParentChain("unknown", objects)).toEqual([]);
	});
});
