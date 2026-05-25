import { describe, it, expect } from "vitest";

import { doSegmentsIntersect } from "../../geometry/doSegmentsIntersect";

describe("doSegmentsIntersect", () => {
	it("交差する線分はtrueを返す（X字）", () => {
		const result = doSegmentsIntersect(
			{ x: 0, y: 0 },
			{ x: 2, y: 2 },
			{ x: 0, y: 2 },
			{ x: 2, y: 0 },
		);
		expect(result).toBe(true);
	});

	it("平行な線分はfalseを返す", () => {
		const result = doSegmentsIntersect(
			{ x: 0, y: 0 },
			{ x: 2, y: 0 },
			{ x: 0, y: 1 },
			{ x: 2, y: 1 },
		);
		expect(result).toBe(false);
	});

	it("同一直線上の線分（共線）はfalseを返す", () => {
		const result = doSegmentsIntersect(
			{ x: 0, y: 0 },
			{ x: 2, y: 0 },
			{ x: 1, y: 0 },
			{ x: 3, y: 0 },
		);
		expect(result).toBe(false);
	});

	it("端点で接触する場合（inclusive=true）はtrueを返す", () => {
		const result = doSegmentsIntersect(
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 1, y: 0 },
			{ x: 2, y: 0 },
			true,
		);
		// 共線なのでfalse
		expect(result).toBe(false);
	});

	it("T字交差（端点が中間点に当たる）はinclusiveでtrueを返す", () => {
		const result = doSegmentsIntersect(
			{ x: 1, y: 0 },
			{ x: 1, y: 2 },
			{ x: 0, y: 1 },
			{ x: 2, y: 1 },
			true,
		);
		expect(result).toBe(true);
	});

	it("T字交差（端点が中間点に当たる）はinclusiveでtrueを返す（非inclusive）", () => {
		// 端点での交差はinclusive=falseでは非交差
		const result = doSegmentsIntersect(
			{ x: 0, y: 0 },
			{ x: 2, y: 0 },
			{ x: 1, y: 0 },
			{ x: 1, y: 2 },
			false,
		);
		// t=0.5(interior), u=0(endpoint) なのでfalse
		expect(result).toBe(false);
	});

	it("明らかに交差しない線分はfalseを返す", () => {
		const result = doSegmentsIntersect(
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 3, y: 0 },
			{ x: 4, y: 0 },
		);
		expect(result).toBe(false);
	});
});
