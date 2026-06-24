import { describe, expect, it } from "vitest";

import { isStrokeDashType, StrokeDashTypes } from "../StrokeDashType";

describe("isStrokeDashType", () => {
	it("有効な値をすべて受け入れる", () => {
		for (const value of StrokeDashTypes) {
			expect(isStrokeDashType(value)).toBe(true);
		}
	});

	it("一覧外の値を拒否する", () => {
		expect(isStrokeDashType("double")).toBe(false);
		expect(isStrokeDashType("")).toBe(false);
		expect(isStrokeDashType(undefined)).toBe(false);
	});
});
