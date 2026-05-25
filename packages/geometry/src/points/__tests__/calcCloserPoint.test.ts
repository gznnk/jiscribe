import { describe, it, expect } from "vitest";

import { calcCloserPoint } from "../calcCloserPoint";

describe("calcCloserPoint", () => {
	it("Aが近い場合はAを返す", () => {
		const result = calcCloserPoint(0, 0, 1, 0, 10, 0);
		expect(result).toEqual({ x: 1, y: 0 });
	});

	it("Bが近い場合はBを返す", () => {
		const result = calcCloserPoint(9, 0, 1, 0, 10, 0);
		expect(result).toEqual({ x: 10, y: 0 });
	});

	it("等距離の場合はBを返す", () => {
		// (0,0) からA(−1,0)とB(1,0)は等距離
		// distanceA < distanceB が false なので B を返す
		const result = calcCloserPoint(0, 0, -1, 0, 1, 0);
		expect(result).toEqual({ x: 1, y: 0 });
	});

	it("基準点と同じ座標がある場合はその点を返す", () => {
		const result = calcCloserPoint(5, 5, 5, 5, 0, 0);
		expect(result).toEqual({ x: 5, y: 5 });
	});
});
