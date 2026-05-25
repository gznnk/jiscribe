import { describe, it, expect } from "vitest";

import { isNumber } from "../isNumber";

describe("isNumber", () => {
	it("数値はtrueを返す", () => {
		expect(isNumber(0)).toBe(true);
		expect(isNumber(42)).toBe(true);
		expect(isNumber(-1)).toBe(true);
		expect(isNumber(3.14)).toBe(true);
		expect(isNumber(Infinity)).toBe(true);
	});

	it("NaNはfalseを返す", () => {
		expect(isNumber(NaN)).toBe(false);
	});

	it("数値以外はfalseを返す", () => {
		expect(isNumber("42")).toBe(false);
		expect(isNumber(null)).toBe(false);
		expect(isNumber(undefined)).toBe(false);
		expect(isNumber(true)).toBe(false);
	});
});
