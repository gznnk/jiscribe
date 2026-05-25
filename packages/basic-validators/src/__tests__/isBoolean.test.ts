import { describe, it, expect } from "vitest";

import { isBoolean } from "../isBoolean";

describe("isBoolean", () => {
	it("true/false はtrueを返す", () => {
		expect(isBoolean(true)).toBe(true);
		expect(isBoolean(false)).toBe(true);
	});

	it("boolean以外はfalseを返す", () => {
		expect(isBoolean(0)).toBe(false);
		expect(isBoolean(1)).toBe(false);
		expect(isBoolean("true")).toBe(false);
		expect(isBoolean(null)).toBe(false);
		expect(isBoolean(undefined)).toBe(false);
	});
});
