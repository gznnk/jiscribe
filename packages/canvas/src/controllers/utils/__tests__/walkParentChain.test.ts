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

	it("stops on a self-referential parentId", () => {
		const cyclic: Record<string, ObjectState> = {
			a: { id: "a", parentId: "a" } as ObjectState,
		};
		expect(walkParentChain("a", cyclic)).toEqual([]);
	});

	it("stops on a two-node cycle without looping forever", () => {
		const cyclic: Record<string, ObjectState> = {
			a: { id: "a", parentId: "b" } as ObjectState,
			b: { id: "b", parentId: "a" } as ObjectState,
		};
		expect(walkParentChain("a", cyclic)).toEqual(["b"]);
	});
});
