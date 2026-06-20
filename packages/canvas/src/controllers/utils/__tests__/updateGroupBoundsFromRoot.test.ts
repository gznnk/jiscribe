import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { updateGroupBoundsFromRoot } from "../updateGroupBoundsFromRoot";

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

describe("updateGroupBoundsFromRoot", () => {
	it("groupId が存在しない → state をそのまま返し objects をコピーしない", () => {
		const state = makeState({});
		const result = updateGroupBoundsFromRoot(state, "missing");
		// 早期リターンが効き、無駄なオブジェクトコピーが発生しない
		expect(result).toBe(state);
		expect(result.objects).toBe(state.objects);
	});

	it("groupId がグループでない → state をそのまま返し objects をコピーしない", () => {
		const state = makeState({ r1: rect("r1", 0, 0) });
		const result = updateGroupBoundsFromRoot(state, "r1");
		expect(result).toBe(state);
		expect(result.objects).toBe(state.objects);
	});

	it("上に辿った最上位の祖先がグループでない → state をそのまま返す", () => {
		// g1（group, 親は rect r1）から上に辿るとルートは rect なので更新対象なし
		const g1 = group("g1", [], "r1");
		const r1 = rect("r1", 0, 0);
		const state = makeState({ g1, r1 });
		const result = updateGroupBoundsFromRoot(state, "g1");
		expect(result).toBe(state);
		expect(result.objects).toBe(state.objects);
	});

	it("単一グループ（親なし）→ そのグループの境界が更新される", () => {
		const r1 = rect("r1", 80, 60, "g1");
		const g1 = group("g1", ["r1"]);
		const state = makeState({ g1, r1 });
		const result = updateGroupBoundsFromRoot(state, "g1");
		const updatedG1 = result.objects["g1"] as unknown as {
			cx: number;
			cy: number;
			width: number;
			height: number;
		};
		expect(updatedG1.cx).toBeCloseTo(80);
		expect(updatedG1.cy).toBeCloseTo(60);
		expect(updatedG1.width).toBeCloseTo(20);
		expect(updatedG1.height).toBeCloseTo(20);
	});

	it("ネストグループ → ルートから辿って全グループを更新する", () => {
		const r1 = rect("r1", 50, 50, "inner");
		const inner = group("inner", ["r1"], "outer");
		const outer = group("outer", ["inner"]);
		const state = makeState({ r1, inner, outer });
		// inner の groupId を渡しても、outer がルートなので outer から更新される
		const result = updateGroupBoundsFromRoot(state, "inner");
		const updatedInner = result.objects["inner"] as unknown as {
			cx: number;
			cy: number;
		};
		const updatedOuter = result.objects["outer"] as unknown as {
			cx: number;
			cy: number;
		};
		expect(updatedInner.cx).toBeCloseTo(50);
		expect(updatedOuter.cx).toBeCloseTo(50);
	});

	it("元の state.objects は変更されない（イミュータブル）", () => {
		const r1 = rect("r1", 100, 100, "g1");
		const g1 = group("g1", ["r1"]);
		const originalObjects = { g1, r1 };
		const state = makeState(originalObjects);
		updateGroupBoundsFromRoot(state, "g1");
		const originalG1 = originalObjects["g1"] as unknown as { cx: number };
		expect(originalG1.cx).toBe(0);
	});
});
