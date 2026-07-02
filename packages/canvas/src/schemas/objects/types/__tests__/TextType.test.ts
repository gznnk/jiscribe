import { describe, expect, it } from "vitest";

import { isTextType, TextTypes } from "../TextType";

describe("isTextType", () => {
	it("accepts all valid values", () => {
		for (const value of TextTypes) {
			expect(isTextType(value)).toBe(true);
		}
	});

	it("rejects values not in the list", () => {
		expect(isTextType("html")).toBe(false);
		expect(isTextType("")).toBe(false);
		expect(isTextType(null)).toBe(false);
	});
});
