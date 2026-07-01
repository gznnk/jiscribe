import { describe, it, expect } from "vitest";

import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { calcGroupBoundingBox } from "../calcGroupBoundingBox";

const rect = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
) =>
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
	}) as unknown;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

const poly = (id: string, points: Array<{ x: number; y: number }>) =>
	({ id, type: "polyline", points }) as unknown;

describe("calcGroupBoundingBox", () => {
	it("childIds が空のとき null を返す", () => {
		const g = group("g", []);
		expect(calcGroupBoundingBox(g, {})).toBeNull();
	});

	it("存在しない childId のみのとき null を返す", () => {
		const g = group("g", ["missing"]);
		expect(calcGroupBoundingBox(g, {})).toBeNull();
	});

	describe("単一の矩形子要素", () => {
		it("rotation=0 の rect のバウンディングボックスを正しく計算する", () => {
			const child = rect("r", 100, 100, 100, 50);
			const g = group("g", ["r"]);
			const result = calcGroupBoundingBox(g, { r: child });
			expect(result).toEqual({ left: 50, top: 75, right: 150, bottom: 125 });
		});
	});

	describe("複数の矩形子要素", () => {
		it("2つの rect の合成バウンディングボックスを返す", () => {
			const r1 = rect("r1", 50, 50, 40, 40);
			const r2 = rect("r2", 150, 150, 40, 40);
			const g = group("g", ["r1", "r2"]);
			const result = calcGroupBoundingBox(g, { r1, r2 });
			// r1: left=30, top=30, right=70, bottom=70
			// r2: left=130, top=130, right=170, bottom=170
			expect(result).toEqual({ left: 30, top: 30, right: 170, bottom: 170 });
		});
	});

	describe("ネストしたグループ", () => {
		it("ネストしたグループを再帰的に処理してバウンディングボックスを返す", () => {
			const child = rect("r", 100, 100, 100, 100);
			const innerGroup = group("inner", ["r"]);
			const outerGroup = group("outer", ["inner"]);
			const objects = { r: child, inner: innerGroup };
			// inner: left=50, top=50, right=150, bottom=150
			const result = calcGroupBoundingBox(outerGroup, objects);
			expect(result).toEqual({ left: 50, top: 50, right: 150, bottom: 150 });
		});

		it("空のネストグループは無視される", () => {
			const child = rect("r", 100, 100, 100, 100);
			const emptyInner = group("empty", []);
			const outerGroup = group("outer", ["empty", "r"]);
			const objects = { r: child, empty: emptyInner };
			const result = calcGroupBoundingBox(outerGroup, objects);
			expect(result).toEqual({ left: 50, top: 50, right: 150, bottom: 150 });
		});
	});

	describe("Poly 子要素", () => {
		it("polyline の points からバウンディングボックスを計算する", () => {
			const p = poly("pl", [
				{ x: 10, y: 20 },
				{ x: 50, y: 80 },
				{ x: 30, y: 10 },
			]);
			const g = group("g", ["pl"]);
			const result = calcGroupBoundingBox(g, { pl: p });
			expect(result).toEqual({ left: 10, top: 10, right: 50, bottom: 80 });
		});

		it("points が空の polyline は無視される", () => {
			const emptyPoly = poly("pl", []);
			const g = group("g", ["pl"]);
			expect(calcGroupBoundingBox(g, { pl: emptyPoly })).toBeNull();
		});
	});
});
