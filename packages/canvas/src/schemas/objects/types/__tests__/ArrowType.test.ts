import { describe, expect, it } from "vitest";

import { ArrowTypes, isArrowType } from "../ArrowType";

describe("isArrowType", () => {
	it("有効な値をすべて受け入れる", () => {
		for (const value of ArrowTypes) {
			expect(isArrowType(value)).toBe(true);
		}
	});

	it('"None" も有効な ArrowType として扱う', () => {
		expect(isArrowType("None")).toBe(true);
	});

	it("一覧外の値を拒否する", () => {
		expect(isArrowType("Arrow")).toBe(false);
		expect(isArrowType("filledtriangle")).toBe(false); // 大文字小文字を区別する
		expect(isArrowType(null)).toBe(false);
	});
});
