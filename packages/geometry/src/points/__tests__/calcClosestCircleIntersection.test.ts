import { describe, it, expect } from "vitest";

import { calcClosestCircleIntersection } from "../../points/calcClosestCircleIntersection";

describe("calcClosestCircleIntersection", () => {
	it("参照点が中心と同じ場合は (cx+r, cy) を返す", () => {
		const result = calcClosestCircleIntersection(0, 0, 10, 0, 0);
		expect(result).toEqual({ x: 10, y: 0 });
	});

	it("参照点が右にある場合は右端の点を返す", () => {
		const result = calcClosestCircleIntersection(0, 0, 10, 20, 0);
		expect(result.x).toBeCloseTo(10);
		expect(result.y).toBeCloseTo(0);
	});

	it("参照点が上にある場合は上端の点を返す", () => {
		const result = calcClosestCircleIntersection(0, 0, 10, 0, -20);
		expect(result.x).toBeCloseTo(0);
		expect(result.y).toBeCloseTo(-10);
	});

	it("参照点が左にある場合は左端の点を返す", () => {
		const result = calcClosestCircleIntersection(0, 0, 10, -20, 0);
		expect(result.x).toBeCloseTo(-10);
		expect(result.y).toBeCloseTo(0);
	});

	it("中心がオフセットされた円も正しく処理する", () => {
		const result = calcClosestCircleIntersection(5, 5, 5, 10, 5);
		expect(result.x).toBeCloseTo(10);
		expect(result.y).toBeCloseTo(5);
	});
});
