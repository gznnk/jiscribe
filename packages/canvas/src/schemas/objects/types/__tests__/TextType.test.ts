import { describe, expect, it } from "vitest";

import { isTextType, TextTypes } from "../TextType";

describe("isTextType", () => {
	it("有効な値をすべて受け入れる", () => {
		for (const value of TextTypes) {
			expect(isTextType(value)).toBe(true);
		}
	});

	it("一覧外の値を拒否する", () => {
		expect(isTextType("html")).toBe(false);
		expect(isTextType("")).toBe(false);
		expect(isTextType(null)).toBe(false);
	});
});
