import { describe, expect, it } from "vitest";

import { isVerticalAlign, VerticalAligns } from "../VerticalAlign";

describe("isVerticalAlign", () => {
	it("accepts all valid values", () => {
		for (const value of VerticalAligns) {
			expect(isVerticalAlign(value)).toBe(true);
		}
	});

	it("rejects strings not in the list", () => {
		expect(isVerticalAlign("center")).toBe(false); // a TextAlign value, not a VerticalAlign
		expect(isVerticalAlign("")).toBe(false);
	});

	it("rejects non-string values", () => {
		expect(isVerticalAlign(undefined)).toBe(false);
		expect(isVerticalAlign(null)).toBe(false);
		expect(isVerticalAlign(1)).toBe(false);
	});
});
