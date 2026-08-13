import { describe, it, expect } from "vitest";

import { isNonNegativeNumber } from "../isNonNegativeNumber";

describe("isNonNegativeNumber", () => {
	it("returns true for a number of 0 or more", () => {
		expect(isNonNegativeNumber(0)).toBe(true);
		expect(isNonNegativeNumber(1)).toBe(true);
		expect(isNonNegativeNumber(0.001)).toBe(true);
	});

	it("returns false for a negative number", () => {
		expect(isNonNegativeNumber(-1)).toBe(false);
		expect(isNonNegativeNumber(-0.001)).toBe(false);
	});

	it("returns false for a non-number", () => {
		expect(isNonNegativeNumber(NaN)).toBe(false);
		expect(isNonNegativeNumber("0")).toBe(false);
		expect(isNonNegativeNumber(null)).toBe(false);
	});
});
