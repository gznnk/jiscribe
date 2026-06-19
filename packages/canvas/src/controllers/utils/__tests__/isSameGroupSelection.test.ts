import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { isSameGroupSelection } from "../isSameGroupSelection";

const makeState = (
	selectedIds: string[],
	objects: Record<string, { parentId?: string }>,
): CanvasControllerState =>
	({ selectedIds, objects }) as unknown as CanvasControllerState;

describe("isSameGroupSelection", () => {
	it("選択なしのとき false を返す", () => {
		expect(isSameGroupSelection(makeState([], {}))).toBe(false);
	});

	describe("ルートレベル（parentId なし）", () => {
		it("1件のルートオブジェクトが選択されているとき true を返す", () => {
			const state = makeState(["a"], { a: {} });
			expect(isSameGroupSelection(state)).toBe(true);
		});

		it("複数のルートオブジェクトが選択されているとき true を返す", () => {
			const state = makeState(["a", "b"], { a: {}, b: {} });
			expect(isSameGroupSelection(state)).toBe(true);
		});
	});

	describe("同一グループ内の選択", () => {
		it("同じ親を持つ複数オブジェクトが選択されているとき true を返す", () => {
			const state = makeState(["child1", "child2"], {
				child1: { parentId: "group1" },
				child2: { parentId: "group1" },
			});
			expect(isSameGroupSelection(state)).toBe(true);
		});
	});

	describe("異なるグループにまたがる選択", () => {
		it("異なる親を持つオブジェクトが選択されているとき false を返す", () => {
			const state = makeState(["child1", "child2"], {
				child1: { parentId: "group1" },
				child2: { parentId: "group2" },
			});
			expect(isSameGroupSelection(state)).toBe(false);
		});

		it("ルートとグループ内が混在するとき false を返す", () => {
			const state = makeState(["root", "child"], {
				root: {},
				child: { parentId: "group1" },
			});
			expect(isSameGroupSelection(state)).toBe(false);
		});
	});
});
