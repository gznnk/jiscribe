import { describe, it, expect } from "vitest";

import { isPoint } from "../isPoint";

describe("isPoint", () => {
	it("returns true for a valid Point", () => {
		expect(isPoint({ x: 0, y: 0 })).toBe(true);
		expect(isPoint({ x: -5, y: 3.14 })).toBe(true);
	});

	it("returns true even with extra properties", () => {
		expect(isPoint({ x: 1, y: 2, extra: "foo" })).toBe(true);
	});

	it("returns false when x is missing", () => {
		expect(isPoint({ y: 0 })).toBe(false);
	});

	it("returns false when y is missing", () => {
		expect(isPoint({ x: 0 })).toBe(false);
	});

	it("returns false when x is not a number", () => {
		expect(isPoint({ x: "0", y: 0 })).toBe(false);
	});

	it("returns false for null", () => {
		expect(isPoint(null)).toBe(false);
	});

	it("returns false for primitives", () => {
		expect(isPoint(42)).toBe(false);
		expect(isPoint("string")).toBe(false);
	});
});
