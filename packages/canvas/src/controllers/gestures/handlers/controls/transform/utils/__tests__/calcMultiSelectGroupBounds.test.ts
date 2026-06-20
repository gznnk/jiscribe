import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../../states/objects/primitives/group/GroupState";
import { calcMultiSelectGroupBounds } from "../calcMultiSelectGroupBounds";

const rect = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

describe("calcMultiSelectGroupBounds", () => {
	it("selectedIds が 0 件 → null", () => {
		expect(calcMultiSelectGroupBounds([], {})).toBeNull();
	});

	it("selectedIds が 1 件 → null", () => {
		const objects = { r1: rect("r1", 50, 50, 40, 40) };
		expect(calcMultiSelectGroupBounds(["r1"], objects)).toBeNull();
	});

	it("有効なオブジェクトが見つからない → null", () => {
		expect(calcMultiSelectGroupBounds(["a", "b"], {})).toBeNull();
	});

	describe("existingGroup なし（AABB 計算）", () => {
		it("2 件の rect → AABB の cx/cy/width/height を返す", () => {
			const r1 = rect("r1", 50, 50, 40, 40); // left=30, right=70, top=30, bottom=70
			const r2 = rect("r2", 150, 150, 40, 40); // left=130, right=170, top=130, bottom=170
			const result = calcMultiSelectGroupBounds(["r1", "r2"], { r1, r2 });
			expect(result).not.toBeNull();
			expect(result?.cx).toBeCloseTo(100);
			expect(result?.cy).toBeCloseTo(100);
			expect(result?.width).toBeCloseTo(140);
			expect(result?.height).toBeCloseTo(140);
		});

		it("ネストしたグループ → 孫要素の点で計算する", () => {
			const r1 = rect("r1", 0, 0, 20, 20);
			const innerGroup: ObjectState = {
				id: "inner",
				type: "group",
				childIds: ["r1"],
			} as unknown as ObjectState;
			const r2 = rect("r2", 100, 0, 20, 20);
			const objects = { r1, r2, inner: innerGroup };
			const result = calcMultiSelectGroupBounds(["inner", "r2"], objects);
			expect(result).not.toBeNull();
			expect(result?.cx).toBeCloseTo(50);
		});
	});

	describe("existingGroup あり（OBB 計算）", () => {
		it("rotation=0 の existingGroup → AABB と同じ結果になる", () => {
			const r1 = rect("r1", 50, 50, 40, 40);
			const r2 = rect("r2", 150, 150, 40, 40);
			const existingGroup = {
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			} as GroupState;
			const result = calcMultiSelectGroupBounds(
				["r1", "r2"],
				{ r1, r2 },
				existingGroup,
			);
			expect(result).not.toBeNull();
			expect(result?.cx).toBeCloseTo(100);
			expect(result?.cy).toBeCloseTo(100);
		});

		it("existingGroup が null → AABB 計算にフォールバック", () => {
			const r1 = rect("r1", 50, 50, 40, 40);
			const r2 = rect("r2", 150, 150, 40, 40);
			const result = calcMultiSelectGroupBounds(["r1", "r2"], { r1, r2 }, null);
			expect(result?.cx).toBeCloseTo(100);
		});
	});
});
