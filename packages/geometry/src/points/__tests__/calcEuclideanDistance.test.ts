import { describe, it, expect } from "vitest";

import { calcEuclideanDistance } from "../calcEuclideanDistance";

describe("calcEuclideanDistance", () => {
	it("同じ点の距離は0", () => {
		expect(calcEuclideanDistance(0, 0, 0, 0)).toBe(0);
		expect(calcEuclideanDistance(3, 4, 3, 4)).toBe(0);
	});

	it("水平方向の距離を計算する", () => {
		expect(calcEuclideanDistance(0, 0, 5, 0)).toBe(5);
		expect(calcEuclideanDistance(2, 1, 8, 1)).toBe(6);
	});

	it("垂直方向の距離を計算する", () => {
		expect(calcEuclideanDistance(0, 0, 0, 3)).toBe(3);
	});

	it("斜めの距離を計算する（3-4-5直角三角形）", () => {
		expect(calcEuclideanDistance(0, 0, 3, 4)).toBe(5);
	});

	it("負の座標でも正しく計算する", () => {
		expect(calcEuclideanDistance(-1, -1, 2, 3)).toBeCloseTo(5);
	});
});
