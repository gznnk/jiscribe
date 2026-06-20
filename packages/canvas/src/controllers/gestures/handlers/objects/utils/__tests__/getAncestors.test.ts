import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { getAncestors } from "../getAncestors";

const makeState = (objects: Record<string, unknown>): CanvasControllerState =>
	({ objects }) as unknown as CanvasControllerState;

describe("getAncestors", () => {
	it("存在しない ID → []", () => {
		expect(getAncestors(makeState({}), "missing")).toEqual([]);
	});

	it("ルートレベルのオブジェクト（parentId なし）→ []", () => {
		const state = makeState({ r1: { type: "rect" } });
		expect(getAncestors(state, "r1")).toEqual([]);
	});

	it("1 階層 → [親ID]", () => {
		const state = makeState({
			g1: { type: "group", childIds: ["r1"] },
			r1: { type: "rect", parentId: "g1" },
		});
		expect(getAncestors(state, "r1")).toEqual(["g1"]);
	});

	it("2 階層 → [ルート, 中間] の順（root から leaf へ）", () => {
		const state = makeState({
			g1: { type: "group", childIds: ["g2"] },
			g2: { type: "group", childIds: ["r1"], parentId: "g1" },
			r1: { type: "rect", parentId: "g2" },
		});
		expect(getAncestors(state, "r1")).toEqual(["g1", "g2"]);
	});

	it("3 階層 → [最上位, 中間, 直親] の順", () => {
		const state = makeState({
			root: { type: "group", childIds: ["mid"] },
			mid: { type: "group", childIds: ["inner"], parentId: "root" },
			inner: { type: "group", childIds: ["r1"], parentId: "mid" },
			r1: { type: "rect", parentId: "inner" },
		});
		expect(getAncestors(state, "r1")).toEqual(["root", "mid", "inner"]);
	});
});
