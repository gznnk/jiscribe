import { describe, it, expect } from "vitest";

import { isNonEmptyString } from "../isNonEmptyString";

describe("isNonEmptyString", () => {
	it("returns true for a non-empty string", () => {
		expect(isNonEmptyString("hello")).toBe(true);
		expect(isNonEmptyString("a")).toBe(true);
	});

	it("returns false for an empty or whitespace-only string", () => {
		expect(isNonEmptyString("")).toBe(false);
		expect(isNonEmptyString("   ")).toBe(false);
		expect(isNonEmptyString("\t\n")).toBe(false);
	});

	it("returns false for a non-string", () => {
		expect(isNonEmptyString(null)).toBe(false);
		expect(isNonEmptyString(undefined)).toBe(false);
		expect(isNonEmptyString(42)).toBe(false);
	});
});
