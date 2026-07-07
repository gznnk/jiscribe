import { describe, expect, it } from "vitest";

import { numberOverride, pickSupportedDocDefaults } from "../ShapeFactory";

describe("numberOverride", () => {
	it("returns the number as-is when one is given", () => {
		expect(numberOverride(42, 10)).toBe(42);
		expect(numberOverride(0, 10)).toBe(0);
		expect(numberOverride(-5, 10)).toBe(-5);
	});

	it("returns the fallback for anything that is not a finite number", () => {
		expect(numberOverride(undefined, 10)).toBe(10);
		expect(numberOverride(null, 10)).toBe(10);
		expect(numberOverride("3", 10)).toBe(10);
		// NaN / Infinity are invalid as dimensions, so fall back
		expect(numberOverride(NaN, 10)).toBe(10);
		expect(numberOverride(Infinity, 10)).toBe(10);
	});
});

describe("pickSupportedDocDefaults", () => {
	const docDefaults = { fontFamily: "serif" };

	it("picks fontFamily when the shape's defaults declare it", () => {
		expect(
			pickSupportedDocDefaults({ fontFamily: "Noto Sans JP" }, docDefaults),
		).toEqual({ fontFamily: "serif" });
	});

	it("returns nothing for shapes without fontFamily (e.g. polyline)", () => {
		expect(pickSupportedDocDefaults({ stroke: "auto" }, docDefaults)).toEqual(
			{},
		);
	});

	it("returns nothing when docDefaults are absent", () => {
		expect(
			pickSupportedDocDefaults({ fontFamily: "Noto Sans JP" }, undefined),
		).toEqual({});
	});
});
