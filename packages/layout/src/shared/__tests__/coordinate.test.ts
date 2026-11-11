import { describe, expect, it } from "vitest";

import { isAtLeast, signOf } from "../coordinate";

describe("isAtLeast", () => {
	it("counts a float's noise below the bound as reaching it", () => {
		expect(isAtLeast(1 - 1e-7, 1)).toBe(true);
	});

	it("refuses a value further below", () => {
		expect(isAtLeast(1 - 1e-5, 1)).toBe(false);
	});

	it.each([0, -0])("counts %d as at least 0", (value) => {
		expect(isAtLeast(value, 0)).toBe(true);
	});

	it("refuses NaN", () => {
		expect(isAtLeast(Number.NaN, 0)).toBe(false);
	});
});

describe("signOf", () => {
	it("counts a float's noise as 0", () => {
		expect(signOf(1e-7)).toBe(0);
		expect(signOf(-1e-7)).toBe(0);
	});

	it("gives the sign of anything further out", () => {
		expect(signOf(1e-5)).toBe(1);
		expect(signOf(-1e-5)).toBe(-1);
	});
});
