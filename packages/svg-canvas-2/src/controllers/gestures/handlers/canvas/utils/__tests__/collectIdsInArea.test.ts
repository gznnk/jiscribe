import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { collectIdsInArea } from "../collectIdsInArea";

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

const poly = (
	id: string,
	points: Array<{ x: number; y: number }>,
): ObjectState => ({ id, type: "polyline", points }) as unknown as ObjectState;

const connector = (id: string): ObjectState =>
	({
		id,
		type: "connector",
		points: [{ x: 0, y: 0 }],
	}) as unknown as ObjectState;

describe("collectIdsInArea", () => {
	it("オブジェクトが空のとき [] を返す", () => {
		expect(collectIdsInArea({}, 0, 0, 100, 100)).toEqual([]);
	});

	describe("矩形（TransformedFrame）", () => {
		it("完全に範囲内に収まるオブジェクトを含める", () => {
			// rect: cx=50, cy=50, w=40, h=40 → bbox: 30,30 〜 70,70
			const r = rect("r", 50, 50, 40, 40);
			const result = collectIdsInArea({ r }, 0, 0, 100, 100);
			expect(result).toContain("r");
		});

		it("部分的にはみ出るオブジェクトを除外する（右端超過）", () => {
			// rect: cx=90, cy=50, w=40, h=40 → bbox: 70,30 〜 110,70
			const r = rect("r", 90, 50, 40, 40);
			const result = collectIdsInArea({ r }, 0, 0, 100, 100);
			expect(result).not.toContain("r");
		});

		it("範囲外のオブジェクトを除外する", () => {
			// rect: cx=200, cy=200, w=40, h=40 → 範囲外
			const r = rect("r", 200, 200, 40, 40);
			const result = collectIdsInArea({ r }, 0, 0, 100, 100);
			expect(result).not.toContain("r");
		});

		it("bbox の端が範囲境界にちょうど接するとき含める", () => {
			// rect: cx=50, cy=50, w=100, h=100 → bbox: 0,0 〜 100,100
			const r = rect("r", 50, 50, 100, 100);
			const result = collectIdsInArea({ r }, 0, 0, 100, 100);
			expect(result).toContain("r");
		});
	});

	describe("Poly（Polyline / Polygon）", () => {
		it("完全に範囲内の polyline を含める", () => {
			const p = poly("p", [
				{ x: 10, y: 10 },
				{ x: 40, y: 40 },
			]);
			const result = collectIdsInArea({ p }, 0, 0, 100, 100);
			expect(result).toContain("p");
		});

		it("はみ出る polyline を除外する", () => {
			const p = poly("p", [
				{ x: 10, y: 10 },
				{ x: 120, y: 40 },
			]);
			const result = collectIdsInArea({ p }, 0, 0, 100, 100);
			expect(result).not.toContain("p");
		});

		it("points が空の polyline は除外する", () => {
			const p = poly("p", []);
			const result = collectIdsInArea({ p }, 0, 0, 100, 100);
			expect(result).not.toContain("p");
		});
	});

	describe("Connector", () => {
		it("connector は type チェックでスキップされる", () => {
			const c = connector("c");
			const result = collectIdsInArea({ c }, 0, 0, 1000, 1000);
			expect(result).not.toContain("c");
		});
	});

	describe("複数オブジェクト混在", () => {
		it("範囲内外が混在するとき範囲内のみを返す", () => {
			const inside = rect("inside", 50, 50, 40, 40);
			const outside = rect("outside", 200, 200, 40, 40);
			const result = collectIdsInArea({ inside, outside }, 0, 0, 100, 100);
			expect(result).toContain("inside");
			expect(result).not.toContain("outside");
		});
	});
});
