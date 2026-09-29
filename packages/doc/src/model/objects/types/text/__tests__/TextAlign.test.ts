import { describe, expect, it } from "vitest";

import { isTextAlign, TextAligns } from "../TextAlign";

describe("isTextAlign", () => {
	it("accepts all valid values", () => {
		for (const value of TextAligns) {
			expect(isTextAlign(value)).toBe(true);
		}
	});

	it("rejects strings not in the list", () => {
		expect(isTextAlign("justify")).toBe(false);
		expect(isTextAlign("")).toBe(false);
	});

	it("rejects non-string values", () => {
		expect(isTextAlign(undefined)).toBe(false);
		expect(isTextAlign(null)).toBe(false);
		expect(isTextAlign(0)).toBe(false);
	});
});
