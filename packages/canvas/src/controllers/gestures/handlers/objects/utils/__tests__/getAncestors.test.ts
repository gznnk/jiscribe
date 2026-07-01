import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { getAncestors } from "../getAncestors";

const makeState = (objects: Record<string, unknown>): CanvasControllerState =>
	({ objects }) as unknown as CanvasControllerState;

describe("getAncestors", () => {
	it("non-existent ID -> []", () => {
		expect(getAncestors(makeState({}), "missing")).toEqual([]);
	});

	it("root-level object (no parentId) -> []", () => {
		const state = makeState({ r1: { type: "rect" } });
		expect(getAncestors(state, "r1")).toEqual([]);
	});

	it("1 level -> [parent ID]", () => {
		const state = makeState({
			g1: { type: "group", childIds: ["r1"] },
			r1: { type: "rect", parentId: "g1" },
		});
		expect(getAncestors(state, "r1")).toEqual(["g1"]);
	});

	it("2 levels -> [root, intermediate] order (root to leaf)", () => {
		const state = makeState({
			g1: { type: "group", childIds: ["g2"] },
			g2: { type: "group", childIds: ["r1"], parentId: "g1" },
			r1: { type: "rect", parentId: "g2" },
		});
		expect(getAncestors(state, "r1")).toEqual(["g1", "g2"]);
	});

	it("3 levels -> [topmost, intermediate, immediate parent] order", () => {
		const state = makeState({
			root: { type: "group", childIds: ["mid"] },
			mid: { type: "group", childIds: ["inner"], parentId: "root" },
			inner: { type: "group", childIds: ["r1"], parentId: "mid" },
			r1: { type: "rect", parentId: "inner" },
		});
		expect(getAncestors(state, "r1")).toEqual(["root", "mid", "inner"]);
	});
});
