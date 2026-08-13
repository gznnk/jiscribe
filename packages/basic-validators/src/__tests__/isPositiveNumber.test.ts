import { describe, it, expect } from "vitest";

import { isPositiveNumber } from "../isPositiveNumber";

describe("isPositiveNumber", () => {
	it("returns true for a number greater than 0", () => {
		expect(isPositiveNumber(1)).toBe(true);
		expect(isPositiveNumber(0.001)).toBe(true);
		expect(isPositiveNumber(Infinity)).toBe(true);
	});

	it("returns false for 0 and negative numbers", () => {
		expect(isPositiveNumber(0)).toBe(false);
		expect(isPositiveNumber(-1)).toBe(false);
	});

	it("returns false for a non-number", () => {
		expect(isPositiveNumber(NaN)).toBe(false);
		expect(isPositiveNumber("1")).toBe(false);
		expect(isPositiveNumber(null)).toBe(false);
	});
});
