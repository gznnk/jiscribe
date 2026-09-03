import { describe, expect, it } from "vitest";

import { isBoldFontWeight } from "../isBoldFontWeight";

describe("isBoldFontWeight", () => {
	it("reads the word and the number as the same weight", () => {
		expect(isBoldFontWeight("bold")).toBe(true);
		expect(isBoldFontWeight("700")).toBe(true);
	});

	it("leaves the middle rungs of the ladder off, the toggle not being a step up it", () => {
		expect(isBoldFontWeight("500")).toBe(false);
		expect(isBoldFontWeight("600")).toBe(false);
	});

	it("reads an unset or unemphasized weight as off", () => {
		expect(isBoldFontWeight(undefined)).toBe(false);
		expect(isBoldFontWeight("normal")).toBe(false);
		expect(isBoldFontWeight("400")).toBe(false);
	});

	it("reads a weight the canvas never writes as off", () => {
		expect(isBoldFontWeight("bolder")).toBe(false);
		expect(isBoldFontWeight("800")).toBe(false);
	});
});
