import { describe, it, expect } from "vitest";

import { isRect } from "../isRect";

describe("isRect", () => {
	it("returns true for a valid Rect", () => {
		expect(isRect({ x: 0, y: 0, width: 100, height: 60 })).toBe(true);
		expect(isRect({ x: -10, y: 5, width: 0, height: 0 })).toBe(true);
	});

	it("returns false for a negative width", () => {
		expect(isRect({ x: 0, y: 0, width: -1, height: 60 })).toBe(false);
	});

	it("returns false for a negative height", () => {
		expect(isRect({ x: 0, y: 0, width: 100, height: -1 })).toBe(false);
	});

	it("returns false when a property is missing", () => {
		expect(isRect({ x: 0, y: 0, width: 100 })).toBe(false);
		expect(isRect({ y: 0, width: 100, height: 60 })).toBe(false);
	});

	it("returns false when x is not a number", () => {
		expect(isRect({ x: "0", y: 0, width: 100, height: 60 })).toBe(false);
	});

	it("returns false for null", () => {
		expect(isRect(null)).toBe(false);
	});
});
