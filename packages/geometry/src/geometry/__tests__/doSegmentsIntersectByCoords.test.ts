import { describe, it, expect } from "vitest";

import { doSegmentsIntersectByCoords } from "../../geometry/doSegmentsIntersectByCoords";

describe("doSegmentsIntersectByCoords", () => {
	it("交差する線分はtrueを返す（X字）", () => {
		const result = doSegmentsIntersectByCoords(0, 0, 2, 2, 0, 2, 2, 0, false);
		expect(result).toBe(true);
	});

	it("平行な線分はfalseを返す", () => {
		const result = doSegmentsIntersectByCoords(0, 0, 2, 0, 0, 1, 2, 1, false);
		expect(result).toBe(false);
	});

	it("同一直線上の線分（共線）はfalseを返す", () => {
		const result = doSegmentsIntersectByCoords(0, 0, 2, 0, 1, 0, 3, 0, false);
		expect(result).toBe(false);
	});

	it("T字交差（端点が中間点に当たる）はinclusive=trueでtrueを返す", () => {
		const result = doSegmentsIntersectByCoords(1, 0, 1, 2, 0, 1, 2, 1, true);
		expect(result).toBe(true);
	});

	it("端点が中間点に当たる交差はinclusive=falseではfalseを返す", () => {
		// t=0.5(interior), u=0(endpoint) なので非inclusiveでは非交差
		const result = doSegmentsIntersectByCoords(0, 0, 2, 0, 1, 0, 1, 2, false);
		expect(result).toBe(false);
	});

	it("明らかに交差しない線分はfalseを返す", () => {
		const result = doSegmentsIntersectByCoords(0, 0, 1, 0, 3, 0, 4, 0, false);
		expect(result).toBe(false);
	});

	it("内部で交差する線分はinclusive=falseでもtrueを返す", () => {
		// 線分中央で直交（t=0.5, u=0.5）。端点に依存しない真の交差。
		const result = doSegmentsIntersectByCoords(0, 1, 2, 1, 1, 0, 1, 2, false);
		expect(result).toBe(true);
	});
});
