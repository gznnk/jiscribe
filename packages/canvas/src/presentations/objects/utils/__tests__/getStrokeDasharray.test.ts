import { describe, it, expect } from "vitest";

import { getStrokeDasharray } from "../getStrokeDasharray";

describe("getStrokeDasharray", () => {
	describe("solid / unspecified", () => {
		it("returns undefined when undefined", () => {
			expect(getStrokeDasharray(undefined)).toBeUndefined();
		});

		it("returns undefined for 'solid'", () => {
			expect(getStrokeDasharray("solid")).toBeUndefined();
		});

		it("solid returns undefined even when strokeWidth is passed", () => {
			expect(getStrokeDasharray("solid", 5)).toBeUndefined();
		});
	});

	describe("dashed", () => {
		it("returns '4 4' when strokeWidth=1", () => {
			expect(getStrokeDasharray("dashed", 1)).toBe("4 4");
		});

		it("returns '8 8' when strokeWidth=2", () => {
			expect(getStrokeDasharray("dashed", 2)).toBe("8 8");
		});

		it("returns '2 2' when strokeWidth=0.5", () => {
			expect(getStrokeDasharray("dashed", 0.5)).toBe("2 2");
		});

		it("the default of 1 is applied when strokeWidth is omitted", () => {
			expect(getStrokeDasharray("dashed")).toBe("4 4");
		});
	});

	describe("dotted", () => {
		it("returns '1 2' when strokeWidth=1", () => {
			expect(getStrokeDasharray("dotted", 1)).toBe("1 2");
		});

		it("returns '3 6' when strokeWidth=3", () => {
			expect(getStrokeDasharray("dotted", 3)).toBe("3 6");
		});

		it("returns '2 4' when strokeWidth=2", () => {
			expect(getStrokeDasharray("dotted", 2)).toBe("2 4");
		});

		it("the default of 1 is applied when strokeWidth is omitted", () => {
			expect(getStrokeDasharray("dotted")).toBe("1 2");
		});
	});
});
