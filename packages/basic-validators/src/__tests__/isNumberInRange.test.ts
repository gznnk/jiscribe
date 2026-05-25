import { describe, it, expect } from "vitest";

import { isNumberInRange } from "../isNumberInRange";

describe("isNumberInRange", () => {
	const is0to100 = isNumberInRange(0, 100);

	it("範囲内の値（境界含む）はtrueを返す", () => {
		expect(is0to100(0)).toBe(true);
		expect(is0to100(50)).toBe(true);
		expect(is0to100(100)).toBe(true);
	});

	it("範囲外の値はfalseを返す", () => {
		expect(is0to100(-1)).toBe(false);
		expect(is0to100(101)).toBe(false);
	});

	it("数値以外はfalseを返す", () => {
		expect(is0to100(NaN)).toBe(false);
		expect(is0to100("50")).toBe(false);
	});
});
