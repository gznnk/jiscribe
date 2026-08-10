import { describe, it, expect } from "vitest";

import { isString } from "../isString";

describe("isString", () => {
	it("returns true for a string", () => {
		expect(isString("")).toBe(true);
		expect(isString("hello")).toBe(true);
	});

	it("returns false for a non-string", () => {
		expect(isString(42)).toBe(false);
		expect(isString(true)).toBe(false);
		expect(isString(null)).toBe(false);
		expect(isString(undefined)).toBe(false);
		expect(isString([])).toBe(false);
		expect(isString({})).toBe(false);
	});
});
