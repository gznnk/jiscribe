import { describe, it, expect } from "vitest";

import { isNonEmptyString } from "../isNonEmptyString";

describe("isNonEmptyString", () => {
	it("空でない文字列はtrueを返す", () => {
		expect(isNonEmptyString("hello")).toBe(true);
		expect(isNonEmptyString("a")).toBe(true);
	});

	it("空文字列や空白のみはfalseを返す", () => {
		expect(isNonEmptyString("")).toBe(false);
		expect(isNonEmptyString("   ")).toBe(false);
		expect(isNonEmptyString("\t\n")).toBe(false);
	});

	it("文字列以外はfalseを返す", () => {
		expect(isNonEmptyString(null)).toBe(false);
		expect(isNonEmptyString(undefined)).toBe(false);
		expect(isNonEmptyString(42)).toBe(false);
	});
});
