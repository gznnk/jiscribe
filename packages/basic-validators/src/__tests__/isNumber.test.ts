import { describe, it, expect } from "vitest";

import { isNumber } from "../isNumber";

describe("isNumber", () => {
	it("returns true for a finite number", () => {
		expect(isNumber(0)).toBe(true);
		expect(isNumber(42)).toBe(true);
		expect(isNumber(-1)).toBe(true);
		expect(isNumber(3.14)).toBe(true);
	});

	it("returns false for NaN", () => {
		expect(isNumber(NaN)).toBe(false);
	});

	// A document has nothing an infinity could mean, and JSON cannot spell one: it would
	// be written, turn into null on save, and fail to parse back
	it("returns false for either infinity", () => {
		expect(isNumber(Infinity)).toBe(false);
		expect(isNumber(-Infinity)).toBe(false);
	});

	it("returns false for a non-number", () => {
		expect(isNumber("42")).toBe(false);
		expect(isNumber(null)).toBe(false);
		expect(isNumber(undefined)).toBe(false);
		expect(isNumber(true)).toBe(false);
	});
});
