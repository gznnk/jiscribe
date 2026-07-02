import { describe, expect, it } from "vitest";

import { numberOverride } from "../ShapeFactory";

describe("numberOverride", () => {
	it("returns the number as-is when one is given", () => {
		expect(numberOverride(42, 10)).toBe(42);
		expect(numberOverride(0, 10)).toBe(0);
		expect(numberOverride(-5, 10)).toBe(-5);
	});

	it("returns the fallback for anything that is not a finite number", () => {
		expect(numberOverride(undefined, 10)).toBe(10);
		expect(numberOverride(null, 10)).toBe(10);
		expect(numberOverride("3", 10)).toBe(10);
		// NaN / Infinity are invalid as dimensions, so fall back
		expect(numberOverride(NaN, 10)).toBe(10);
		expect(numberOverride(Infinity, 10)).toBe(10);
	});
});
