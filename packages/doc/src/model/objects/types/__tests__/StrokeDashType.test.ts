import { describe, expect, it } from "vitest";

import { isStrokeDashType, StrokeDashTypes } from "../StrokeDashType";

describe("isStrokeDashType", () => {
	it("accepts all valid values", () => {
		for (const value of StrokeDashTypes) {
			expect(isStrokeDashType(value)).toBe(true);
		}
	});

	it("rejects values not in the list", () => {
		expect(isStrokeDashType("double")).toBe(false);
		expect(isStrokeDashType("")).toBe(false);
		expect(isStrokeDashType(undefined)).toBe(false);
	});
});
