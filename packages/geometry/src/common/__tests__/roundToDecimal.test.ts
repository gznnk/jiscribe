import { describe, it, expect } from "vitest";

import { roundToDecimal } from "../roundToDecimal";

describe("roundToDecimal", () => {
	it("rounds to 2 decimal places by default", () => {
		expect(roundToDecimal(123.456)).toBe(123.46);
		expect(roundToDecimal(123.454)).toBe(123.45);
	});

	it("rounds to the requested number of decimal places", () => {
		expect(roundToDecimal(123.456, 1)).toBe(123.5);
		expect(roundToDecimal(123.456, 0)).toBe(123);
	});

	it("leaves integers unchanged", () => {
		expect(roundToDecimal(100, 2)).toBe(100);
	});

	it("rounds negative numbers", () => {
		expect(roundToDecimal(-1.235, 2)).toBe(-1.24);
	});
});
