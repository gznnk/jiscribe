import { describe, expect, it } from "vitest";

import { ArrowTypes, isArrowType } from "../ArrowType";

describe("isArrowType", () => {
	it("accepts all valid values", () => {
		for (const value of ArrowTypes) {
			expect(isArrowType(value)).toBe(true);
		}
	});

	it('treats "None" as a valid ArrowType too', () => {
		expect(isArrowType("None")).toBe(true);
	});

	it("rejects values not in the list", () => {
		expect(isArrowType("Arrow")).toBe(false);
		expect(isArrowType("filledtriangle")).toBe(false); // case-sensitive
		expect(isArrowType(null)).toBe(false);
	});
});
