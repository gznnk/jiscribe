import { describe, it, expect } from "vitest";

import { isNumberInRange } from "../isNumberInRange";

describe("isNumberInRange", () => {
	const is0to100 = isNumberInRange(0, 100);

	it("returns true for a value inside the range, bounds included", () => {
		expect(is0to100(0)).toBe(true);
		expect(is0to100(50)).toBe(true);
		expect(is0to100(100)).toBe(true);
	});

	it("returns false for a value outside the range", () => {
		expect(is0to100(-1)).toBe(false);
		expect(is0to100(101)).toBe(false);
	});

	it("returns false for a non-number", () => {
		expect(is0to100(NaN)).toBe(false);
		expect(is0to100("50")).toBe(false);
	});
});
