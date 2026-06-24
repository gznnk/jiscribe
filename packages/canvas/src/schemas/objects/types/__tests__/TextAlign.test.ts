import { describe, expect, it } from "vitest";

import { isTextAlign, TextAligns } from "../TextAlign";

describe("isTextAlign", () => {
	it("有効な値をすべて受け入れる", () => {
		for (const value of TextAligns) {
			expect(isTextAlign(value)).toBe(true);
		}
	});

	it("一覧外の文字列を拒否する", () => {
		expect(isTextAlign("justify")).toBe(false);
		expect(isTextAlign("")).toBe(false);
	});

	it("文字列以外を拒否する", () => {
		expect(isTextAlign(undefined)).toBe(false);
		expect(isTextAlign(null)).toBe(false);
		expect(isTextAlign(0)).toBe(false);
	});
});
