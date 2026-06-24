import { describe, expect, it } from "vitest";

import { isVerticalAlign, VerticalAligns } from "../VerticalAlign";

describe("isVerticalAlign", () => {
	it("有効な値をすべて受け入れる", () => {
		for (const value of VerticalAligns) {
			expect(isVerticalAlign(value)).toBe(true);
		}
	});

	it("一覧外の文字列を拒否する", () => {
		expect(isVerticalAlign("center")).toBe(false); // TextAlign の値であり VerticalAlign ではない
		expect(isVerticalAlign("")).toBe(false);
	});

	it("文字列以外を拒否する", () => {
		expect(isVerticalAlign(undefined)).toBe(false);
		expect(isVerticalAlign(null)).toBe(false);
		expect(isVerticalAlign(1)).toBe(false);
	});
});
