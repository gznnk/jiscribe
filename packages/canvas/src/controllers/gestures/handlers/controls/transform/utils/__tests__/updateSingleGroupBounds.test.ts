import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../../CanvasTypes";
import { updateSingleGroupBounds } from "../updateSingleGroupBounds";

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
		width: 30,
		height: 30,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		parentId,
	}) as unknown as ObjectState;

const group = (id: string, childIds: string[]): ObjectState =>
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
	}) as unknown as ObjectState;

const makeState = (
	objects: Record<string, ObjectState>,
): CanvasControllerState => ({ objects }) as unknown as CanvasControllerState;

describe("updateSingleGroupBounds", () => {
	it("groupId が存在しない → 同一参照を返す", () => {
		const state = makeState({});
		expect(updateSingleGroupBounds(state, "missing")).toBe(state);
	});

	it("groupId がグループでない → 同一参照を返す", () => {
		const r1 = rect("r1", 0, 0);
		const state = makeState({ r1 });
		expect(updateSingleGroupBounds(state, "r1")).toBe(state);
	});

	it("グループの bounds が更新される", () => {
		const r1 = rect("r1", 100, 80, "g1");
		const g1 = group("g1", ["r1"]);
		const state = makeState({ g1, r1 });
		const result = updateSingleGroupBounds(state, "g1");
		const updatedG1 = result.objects["g1"] as unknown as {
			cx: number;
			cy: number;
			width: number;
			height: number;
		};
		expect(updatedG1.cx).toBeCloseTo(100);
		expect(updatedG1.cy).toBeCloseTo(80);
		expect(updatedG1.width).toBeCloseTo(30);
		expect(updatedG1.height).toBeCloseTo(30);
	});

	it("グループ以外の objects は変更されない", () => {
		const r1 = rect("r1", 100, 80, "g1");
		const r2 = rect("r2", 200, 200);
		const g1 = group("g1", ["r1"]);
		const state = makeState({ g1, r1, r2 });
		const result = updateSingleGroupBounds(state, "g1");
		expect(result.objects["r2"]).toBe(r2);
	});

	it("元の state.objects は変更されない（イミュータブル）", () => {
		const r1 = rect("r1", 100, 80, "g1");
		const g1 = group("g1", ["r1"]);
		const originalObjects = { g1, r1 };
		const state = makeState(originalObjects);
		updateSingleGroupBounds(state, "g1");
		const originalG1 = originalObjects["g1"] as unknown as { cx: number };
		expect(originalG1.cx).toBe(0);
	});
});
