import { describe, it, expect } from "vitest";

import type { CanvasState } from "../../../../../../states/canvas/CanvasState";
import { hasSelectedDescendants } from "../hasSelectedDescendants";

const makeState = (objects: Record<string, unknown>): CanvasState =>
	({ objects }) as unknown as CanvasState;

describe("hasSelectedDescendants", () => {
	it("childIds が空のとき false を返す", () => {
		expect(hasSelectedDescendants(makeState({}), [], ["sel"])).toBe(false);
	});

	describe("直接の子", () => {
		it("直接の子が選択済みのとき true を返す", () => {
			const state = makeState({ child: { type: "rect" } });
			expect(hasSelectedDescendants(state, ["child"], ["child"])).toBe(true);
		});

		it("直接の子が選択されていないとき false を返す", () => {
			const state = makeState({ child: { type: "rect" } });
			expect(hasSelectedDescendants(state, ["child"], ["other"])).toBe(false);
		});
	});

	describe("ネスト（孫要素）", () => {
		it("孫が選択済みのとき true を返す", () => {
			const state = makeState({
				group: { type: "group", childIds: ["grandchild"] },
				grandchild: { type: "rect" },
			});
			expect(hasSelectedDescendants(state, ["group"], ["grandchild"])).toBe(
				true,
			);
		});

		it("孫が選択されていないとき false を返す", () => {
			const state = makeState({
				group: { type: "group", childIds: ["grandchild"] },
				grandchild: { type: "rect" },
			});
			expect(hasSelectedDescendants(state, ["group"], ["unrelated"])).toBe(
				false,
			);
		});

		it("深くネストした子孫が選択されているとき true を返す", () => {
			const state = makeState({
				g1: { type: "group", childIds: ["g2"] },
				g2: { type: "group", childIds: ["deep"] },
				deep: { type: "rect" },
			});
			expect(hasSelectedDescendants(state, ["g1"], ["deep"])).toBe(true);
		});
	});

	describe("複数の childIds", () => {
		it("選択済みの子が1件でもあれば true を返す", () => {
			const state = makeState({
				a: { type: "rect" },
				b: { type: "rect" },
				c: { type: "rect" },
			});
			expect(hasSelectedDescendants(state, ["a", "b", "c"], ["b"])).toBe(true);
		});

		it("どの子も選択されていなければ false を返す", () => {
			const state = makeState({
				a: { type: "rect" },
				b: { type: "rect" },
			});
			expect(hasSelectedDescendants(state, ["a", "b"], ["x", "y"])).toBe(false);
		});
	});
});
