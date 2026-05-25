import { describe, it, expect } from "vitest";

import { isPositiveNumber } from "../isPositiveNumber";

describe("isPositiveNumber", () => {
	it("0より大きい数値はtrueを返す", () => {
		expect(isPositiveNumber(1)).toBe(true);
		expect(isPositiveNumber(0.001)).toBe(true);
		expect(isPositiveNumber(Infinity)).toBe(true);
	});

	it("0および負の数値はfalseを返す", () => {
		expect(isPositiveNumber(0)).toBe(false);
		expect(isPositiveNumber(-1)).toBe(false);
	});

	it("数値以外はfalseを返す", () => {
		expect(isPositiveNumber(NaN)).toBe(false);
		expect(isPositiveNumber("1")).toBe(false);
		expect(isPositiveNumber(null)).toBe(false);
	});
});
