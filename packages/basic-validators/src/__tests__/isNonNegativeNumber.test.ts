import { describe, it, expect } from "vitest";

import { isNonNegativeNumber } from "../isNonNegativeNumber";

describe("isNonNegativeNumber", () => {
	it("0以上の数値はtrueを返す", () => {
		expect(isNonNegativeNumber(0)).toBe(true);
		expect(isNonNegativeNumber(1)).toBe(true);
		expect(isNonNegativeNumber(0.001)).toBe(true);
	});

	it("負の数値はfalseを返す", () => {
		expect(isNonNegativeNumber(-1)).toBe(false);
		expect(isNonNegativeNumber(-0.001)).toBe(false);
	});

	it("数値以外はfalseを返す", () => {
		expect(isNonNegativeNumber(NaN)).toBe(false);
		expect(isNonNegativeNumber("0")).toBe(false);
		expect(isNonNegativeNumber(null)).toBe(false);
	});
});
