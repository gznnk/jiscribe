import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { updateGroupBounds } from "../updateGroupBounds";

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

const group = (id: string, childIds: string[]): GroupState =>
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
	}) as unknown as GroupState;

describe("updateGroupBounds", () => {
	it("groupId が存在しない → undefined", () => {
		expect(updateGroupBounds({}, "missing")).toBeUndefined();
	});

	it("type がグループでないオブジェクト → undefined", () => {
		const objects = { r1: rect("r1", 0, 0, 100, 50) };
		expect(updateGroupBounds(objects, "r1")).toBeUndefined();
	});

	it("子が空のグループ → cx=0, cy=0, width=0, height=0", () => {
		const g = group("g1", []);
		const objects = { g1: g as unknown as ObjectState };
		const result = updateGroupBounds(objects, "g1");
		expect(result).toBeDefined();
		expect(result?.cx).toBe(0);
		expect(result?.cy).toBe(0);
		expect(result?.width).toBe(0);
		expect(result?.height).toBe(0);
	});

	it("子 1 件のグループ → 子の境界から cx/cy/width/height を算出", () => {
		const child = rect("r1", 100, 50, 40, 20);
		const g = group("g1", ["r1"]);
		const objects: Record<string, ObjectState> = {
			g1: g as unknown as ObjectState,
			r1: child,
		};
		const result = updateGroupBounds(objects, "g1");
		expect(result).toBeDefined();
		expect(result?.cx).toBeCloseTo(100);
		expect(result?.cy).toBeCloseTo(50);
		expect(result?.width).toBeCloseTo(40);
		expect(result?.height).toBeCloseTo(20);
	});

	it("子 2 件 → 両者を包む境界を返す", () => {
		const r1 = rect("r1", 50, 50, 40, 40);
		const r2 = rect("r2", 150, 150, 40, 40);
		const g = group("g1", ["r1", "r2"]);
		const objects: Record<string, ObjectState> = {
			g1: g as unknown as ObjectState,
			r1,
			r2,
		};
		const result = updateGroupBounds(objects, "g1");
		expect(result).toBeDefined();
		// AABB: left=30, top=30, right=170, bottom=170 → cx=100, cy=100, w=h=140
		expect(result?.cx).toBeCloseTo(100);
		expect(result?.cy).toBeCloseTo(100);
		expect(result?.width).toBeCloseTo(140);
		expect(result?.height).toBeCloseTo(140);
	});

	it("既存グループの他プロパティは保持される", () => {
		const child = rect("r1", 0, 0, 10, 10);
		const g = group("g1", ["r1"]);
		const gWithExtra = {
			...g,
			rotation: 45,
			customProp: "keep-me",
		} as unknown as GroupState;
		const objects: Record<string, ObjectState> = {
			g1: gWithExtra as unknown as ObjectState,
			r1: child,
		};
		const result = updateGroupBounds(objects, "g1");
		expect((result as unknown as { rotation: number }).rotation).toBe(45);
		expect((result as unknown as { customProp: string }).customProp).toBe(
			"keep-me",
		);
	});
});
