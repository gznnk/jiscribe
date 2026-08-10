import { describe, it, expect } from "vitest";

import { isBoolean } from "../isBoolean";

describe("isBoolean", () => {
	it("returns true for true and false", () => {
		expect(isBoolean(true)).toBe(true);
		expect(isBoolean(false)).toBe(true);
	});

	it("returns false for a non-boolean", () => {
		expect(isBoolean(0)).toBe(false);
		expect(isBoolean(1)).toBe(false);
		expect(isBoolean("true")).toBe(false);
		expect(isBoolean(null)).toBe(false);
		expect(isBoolean(undefined)).toBe(false);
	});
});
