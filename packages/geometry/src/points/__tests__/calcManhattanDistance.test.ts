import { describe, it, expect } from "vitest";

import { calcManhattanDistance } from "../calcManhattanDistance";

describe("calcManhattanDistance", () => {
	it("同じ点の距離は0", () => {
		expect(calcManhattanDistance(0, 0, 0, 0)).toBe(0);
	});

	it("水平方向の距離を計算する", () => {
		expect(calcManhattanDistance(0, 0, 5, 0)).toBe(5);
	});

	it("垂直方向の距離を計算する", () => {
		expect(calcManhattanDistance(0, 0, 0, 4)).toBe(4);
	});

	it("斜め移動はX差+Y差", () => {
		expect(calcManhattanDistance(0, 0, 3, 4)).toBe(7);
	});

	it("負の方向でも絶対値で計算する", () => {
		expect(calcManhattanDistance(3, 4, 0, 0)).toBe(7);
	});
});
