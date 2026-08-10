import { describe, it, expect } from "vitest";

import { isEnum } from "../isEnum";

describe("isEnum", () => {
	const isColor = isEnum(["red", "green", "blue"] as const);

	it("returns true for an allowed value", () => {
		expect(isColor("red")).toBe(true);
		expect(isColor("green")).toBe(true);
		expect(isColor("blue")).toBe(true);
	});

	it("returns false for a value that is not allowed", () => {
		expect(isColor("yellow")).toBe(false);
		expect(isColor("")).toBe(false);
		expect(isColor(null)).toBe(false);
		expect(isColor(undefined)).toBe(false);
	});

	it("works for a numeric enum too", () => {
		const isSmallInt = isEnum([1, 2, 3] as const);
		expect(isSmallInt(1)).toBe(true);
		expect(isSmallInt(4)).toBe(false);
	});
});
