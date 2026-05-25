import { describe, it, expect } from "vitest";

import { isEnum } from "../isEnum";

describe("isEnum", () => {
	const isColor = isEnum(["red", "green", "blue"] as const);

	it("許可された値はtrueを返す", () => {
		expect(isColor("red")).toBe(true);
		expect(isColor("green")).toBe(true);
		expect(isColor("blue")).toBe(true);
	});

	it("許可されていない値はfalseを返す", () => {
		expect(isColor("yellow")).toBe(false);
		expect(isColor("")).toBe(false);
		expect(isColor(null)).toBe(false);
		expect(isColor(undefined)).toBe(false);
	});

	it("数値のenumでも動作する", () => {
		const isSmallInt = isEnum([1, 2, 3] as const);
		expect(isSmallInt(1)).toBe(true);
		expect(isSmallInt(4)).toBe(false);
	});
});
