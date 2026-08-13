import { describe, it, expect } from "vitest";

import { isNumber } from "../isNumber";

describe("isNumber", () => {
	it("returns true for a number", () => {
		expect(isNumber(0)).toBe(true);
		expect(isNumber(42)).toBe(true);
		expect(isNumber(-1)).toBe(true);
		expect(isNumber(3.14)).toBe(true);
		expect(isNumber(Infinity)).toBe(true);
	});

	it("returns false for NaN", () => {
		expect(isNumber(NaN)).toBe(false);
	});

	it("returns false for a non-number", () => {
		expect(isNumber("42")).toBe(false);
		expect(isNumber(null)).toBe(false);
		expect(isNumber(undefined)).toBe(false);
		expect(isNumber(true)).toBe(false);
	});
});
