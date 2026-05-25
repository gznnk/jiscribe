import { describe, it, expect } from "vitest";

import { isArray } from "../isArray";

describe("isArray", () => {
	it("配列はtrueを返す", () => {
		expect(isArray([])).toBe(true);
		expect(isArray([1, 2, 3])).toBe(true);
		expect(isArray(["a", "b"])).toBe(true);
	});

	it("配列以外はfalseを返す", () => {
		expect(isArray(null)).toBe(false);
		expect(isArray(undefined)).toBe(false);
		expect(isArray({})).toBe(false);
		expect(isArray("string")).toBe(false);
		expect(isArray(42)).toBe(false);
	});
});
