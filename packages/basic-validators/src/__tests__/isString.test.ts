import { describe, it, expect } from "vitest";

import { isString } from "../isString";

describe("isString", () => {
	it("文字列はtrueを返す", () => {
		expect(isString("")).toBe(true);
		expect(isString("hello")).toBe(true);
	});

	it("文字列以外はfalseを返す", () => {
		expect(isString(42)).toBe(false);
		expect(isString(true)).toBe(false);
		expect(isString(null)).toBe(false);
		expect(isString(undefined)).toBe(false);
		expect(isString([])).toBe(false);
		expect(isString({})).toBe(false);
	});
});
