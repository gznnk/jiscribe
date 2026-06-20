import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { isArrangeableSelection } from "../isArrangeableSelection";

const makeState = (
	selectedIds: string[],
	objects: Record<string, { parentId?: string; type?: string }>,
	selectedConnectorId: string | null = null,
): CanvasControllerState =>
	({
		selectedIds,
		objects,
		selectedConnectorId,
	}) as unknown as CanvasControllerState;

describe("isArrangeableSelection", () => {
	it("選択なしのとき false を返す", () => {
		expect(isArrangeableSelection(makeState([], {}))).toBe(false);
	});

	describe("オブジェクト選択（selectedIds）", () => {
		it("ルート単一は true", () => {
			expect(isArrangeableSelection(makeState(["a"], { a: {} }))).toBe(true);
		});

		it("ルート複数は true", () => {
			expect(
				isArrangeableSelection(makeState(["a", "b"], { a: {}, b: {} })),
			).toBe(true);
		});

		it("同一グループ内の複数は true", () => {
			const state = makeState(["c1", "c2"], {
				c1: { parentId: "g" },
				c2: { parentId: "g" },
			});
			expect(isArrangeableSelection(state)).toBe(true);
		});

		it("異なるグループにまたがると false", () => {
			const state = makeState(["c1", "c2"], {
				c1: { parentId: "g1" },
				c2: { parentId: "g2" },
			});
			expect(isArrangeableSelection(state)).toBe(false);
		});

		it("ルートとグループ内が混在すると false", () => {
			const state = makeState(["r", "c"], {
				r: {},
				c: { parentId: "g" },
			});
			expect(isArrangeableSelection(state)).toBe(false);
		});
	});

	describe("コネクター選択（selectedConnectorId）", () => {
		it("コネクター単一選択は true（StackOrder を出す条件）", () => {
			const state = makeState([], { conn: { type: "connector" } }, "conn");
			expect(isArrangeableSelection(state)).toBe(true);
		});
	});
});
