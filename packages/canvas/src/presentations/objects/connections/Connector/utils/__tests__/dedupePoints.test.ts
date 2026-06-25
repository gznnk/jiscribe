import { describe, it, expect } from "vitest";

import { dedupePoints } from "../dedupePoints";

describe("dedupePoints", () => {
	it("空配列はそのまま空配列を返す", () => {
		expect(dedupePoints([])).toEqual([]);
	});

	it("点が1つだけならその点を返す（複製）", () => {
		const points = [{ x: 1, y: 2 }];
		const result = dedupePoints(points);
		expect(result).toEqual([{ x: 1, y: 2 }]);
		expect(result[0]).not.toBe(points[0]);
	});

	it("重なりのない点列はそのまま残す", () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 50, y: 50 },
		];
		expect(dedupePoints(points)).toEqual(points);
	});

	it("端点と一致する陳腐な経由点を畳んで直線へ戻す", () => {
		// source(0,0) → wp(0,0)重複 → wp(100,0)≒target → target(100,0)
		const points = [
			{ x: 0, y: 0 },
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 0 },
		];
		expect(dedupePoints(points)).toEqual([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		]);
	});

	it("閾値(0.5px)以下の連続点は畳み、超える点は残す", () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 0.4, y: 0 }, // 距離 0.4 ≤ 0.5 → 畳む
			{ x: 1, y: 0 }, // 直前(0,0)から距離 1 > 0.5 → 残す
		];
		expect(dedupePoints(points)).toEqual([
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
		]);
	});

	it("直前としか比較しないため、離れて戻ってきた同一座標は残す", () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 0, y: 0 },
		];
		expect(dedupePoints(points)).toEqual(points);
	});

	it("入力配列・要素を変更しない", () => {
		const points = [
			{ x: 1, y: 1 },
			{ x: 2, y: 2 },
		];
		const snapshot = JSON.parse(JSON.stringify(points));
		const result = dedupePoints(points);
		expect(points).toEqual(snapshot);
		expect(result[0]).not.toBe(points[0]);
	});
});
