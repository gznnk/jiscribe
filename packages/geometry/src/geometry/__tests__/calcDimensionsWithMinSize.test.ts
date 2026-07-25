import { describe, it, expect } from "vitest";

import { calcDimensionsWithMinSize } from "../../geometry/calcDimensionsWithMinSize";

describe("calcDimensionsWithMinSize", () => {
	it("returns the given dimensions when no minimum is set", () => {
		const result = calcDimensionsWithMinSize(100, 50);
		expect(result.effectiveWidth).toBe(100);
		expect(result.effectiveHeight).toBe(50);
	});

	it("keeps width when it exceeds minWidth", () => {
		const result = calcDimensionsWithMinSize(100, 50, 20, 20);
		expect(result.effectiveWidth).toBe(100);
		expect(result.effectiveHeight).toBe(50);
	});

	it("returns minWidth when width falls below it", () => {
		const result = calcDimensionsWithMinSize(10, 10, 50, 50);
		expect(result.effectiveWidth).toBe(50);
		expect(result.effectiveHeight).toBe(50);
	});

	it("returns minWidth when width equals it", () => {
		const result = calcDimensionsWithMinSize(30, 30, 30, 30);
		expect(result.effectiveWidth).toBe(30);
		expect(result.effectiveHeight).toBe(30);
	});

	it("constrains only the axis whose minimum is given", () => {
		const result = calcDimensionsWithMinSize(10, 100, 50);
		expect(result.effectiveWidth).toBe(50);
		expect(result.effectiveHeight).toBe(100);
	});

	it("treats a minimum of 0 as a constraint, not as absent", () => {
		const result = calcDimensionsWithMinSize(-20, -5, 0, 0);
		expect(result.effectiveWidth).toBe(0);
		expect(result.effectiveHeight).toBe(0);
	});

	it("leaves non-negative dimensions untouched under a minimum of 0", () => {
		const result = calcDimensionsWithMinSize(100, 50, 0, 0);
		expect(result.effectiveWidth).toBe(100);
		expect(result.effectiveHeight).toBe(50);
	});
});
