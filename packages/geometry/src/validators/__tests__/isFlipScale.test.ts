import { describe, it, expect } from "vitest";

import { isFlipScale } from "../isFlipScale";

describe("isFlipScale", () => {
	it("returns true for the two flip values", () => {
		expect(isFlipScale(1)).toBe(true);
		expect(isFlipScale(-1)).toBe(true);
	});

	it("returns false for a general scale factor", () => {
		expect(isFlipScale(0)).toBe(false);
		expect(isFlipScale(2)).toBe(false);
		expect(isFlipScale(-2)).toBe(false);
		expect(isFlipScale(0.5)).toBe(false);
		expect(isFlipScale(-0.5)).toBe(false);
	});

	it("returns false for non-numbers that coerce to 1 or -1", () => {
		expect(isFlipScale("1")).toBe(false);
		expect(isFlipScale("-1")).toBe(false);
		expect(isFlipScale(true)).toBe(false);
	});

	it("returns false for nullish and NaN", () => {
		expect(isFlipScale(null)).toBe(false);
		expect(isFlipScale(undefined)).toBe(false);
		expect(isFlipScale(NaN)).toBe(false);
	});
});
