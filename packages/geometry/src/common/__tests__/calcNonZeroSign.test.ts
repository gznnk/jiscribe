import { describe, it, expect } from "vitest";

import { calcNonZeroSign } from "../calcNonZeroSign";

describe("calcNonZeroSign", () => {
	it("returns 1 for positive numbers", () => {
		expect(calcNonZeroSign(5)).toBe(1);
		expect(calcNonZeroSign(0.001)).toBe(1);
	});

	it("returns 1 for zero, unlike Math.sign", () => {
		expect(calcNonZeroSign(0)).toBe(1);
	});

	it("returns -1 for negative numbers", () => {
		expect(calcNonZeroSign(-1)).toBe(-1);
		expect(calcNonZeroSign(-100)).toBe(-1);
	});
});
