import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { updateAffectedGroupBounds } from "../updateAffectedGroupBounds";

const rect = (
	id: string,
	cx: number,
	cy: number,
	parentId?: string,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: 20,
		height: 20,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		parentId,
	}) as unknown as ObjectState;

const group = (
	id: string,
	childIds: string[],
	parentId?: string,
): ObjectState =>
	({
		id,
		type: "group",
		childIds,
		cx: 0,
		cy: 0,
		width: 0,
		height: 0,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		parentId,
	}) as unknown as ObjectState;

const makeState = (
	objects: Record<string, ObjectState>,
): CanvasControllerState => ({ objects }) as unknown as CanvasControllerState;

describe("updateAffectedGroupBounds", () => {
	it("ルートレベルの選択（親グループなし）→ 同一参照を返す", () => {
		const objects = { r1: rect("r1", 100, 100) };
		const state = makeState(objects);
		const result = updateAffectedGroupBounds(state, ["r1"]);
		expect(result).toBe(state);
	});

	it("selectedIds が空 → 同一参照を返す", () => {
		const state = makeState({});
		expect(updateAffectedGroupBounds(state, [])).toBe(state);
	});

	it("存在しない ID → 同一参照を返す", () => {
		const state = makeState({});
		expect(updateAffectedGroupBounds(state, ["missing"])).toBe(state);
	});

	it("1 階層のグループ → 親グループの境界が更新される", () => {
		const r1 = rect("r1", 100, 100, "g1");
		const g1 = group("g1", ["r1"]);
		const state = makeState({ g1, r1 });
		const result = updateAffectedGroupBounds(state, ["r1"]);
		const updatedG1 = result.objects["g1"] as unknown as {
			cx: number;
			cy: number;
			width: number;
			height: number;
		};
		expect(updatedG1.cx).toBeCloseTo(100);
		expect(updatedG1.cy).toBeCloseTo(100);
		expect(updatedG1.width).toBeCloseTo(20);
		expect(updatedG1.height).toBeCloseTo(20);
	});

	it("2 階層のネストグループ → 全祖先が更新される", () => {
		const r1 = rect("r1", 50, 50, "inner");
		const inner = group("inner", ["r1"], "outer");
		const outer = group("outer", ["inner"]);
		const state = makeState({ r1, inner, outer });
		const result = updateAffectedGroupBounds(state, ["r1"]);
		// inner も outer も更新されていることを確認
		const updatedInner = result.objects["inner"] as unknown as { cx: number };
		const updatedOuter = result.objects["outer"] as unknown as { cx: number };
		expect(updatedInner.cx).toBeCloseTo(50);
		expect(updatedOuter.cx).toBeCloseTo(50);
	});

	it("元の state.objects は変更されない（イミュータブル）", () => {
		const r1 = rect("r1", 100, 100, "g1");
		const g1 = group("g1", ["r1"]);
		const originalObjects = { g1, r1 };
		const state = makeState(originalObjects);
		updateAffectedGroupBounds(state, ["r1"]);
		const originalG1 = originalObjects["g1"] as unknown as { cx: number };
		expect(originalG1.cx).toBe(0); // 元の値が変わっていない
	});
});
