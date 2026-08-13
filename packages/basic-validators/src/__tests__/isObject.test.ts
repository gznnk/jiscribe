import { describe, it, expect } from "vitest";

import { isObject } from "../isObject";

describe("isObject", () => {
	it("returns true for a plain object", () => {
		expect(isObject({})).toBe(true);
		expect(isObject({ a: 1 })).toBe(true);
	});

	it("returns false for null", () => {
		expect(isObject(null)).toBe(false);
	});

	it("returns false for an array", () => {
		expect(isObject([])).toBe(false);
		expect(isObject([1, 2])).toBe(false);
	});

	it("returns false for a primitive value", () => {
		expect(isObject("string")).toBe(false);
		expect(isObject(42)).toBe(false);
		expect(isObject(true)).toBe(false);
		expect(isObject(undefined)).toBe(false);
	});
});
