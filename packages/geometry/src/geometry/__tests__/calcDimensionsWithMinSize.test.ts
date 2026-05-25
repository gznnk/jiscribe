import { describe, it, expect } from "vitest";

import { calcDimensionsWithMinSize } from "../../geometry/calcDimensionsWithMinSize";

describe("calcDimensionsWithMinSize", () => {
	it("minが未指定の場合は元の寸法をそのまま返す", () => {
		const result = calcDimensionsWithMinSize(100, 50);
		expect(result.effectiveWidth).toBe(100);
		expect(result.effectiveHeight).toBe(50);
	});

	it("width が minWidth より大きければ width を返す", () => {
		const result = calcDimensionsWithMinSize(100, 50, 20, 20);
		expect(result.effectiveWidth).toBe(100);
		expect(result.effectiveHeight).toBe(50);
	});

	it("width が minWidth より小さければ minWidth を返す", () => {
		const result = calcDimensionsWithMinSize(10, 10, 50, 50);
		expect(result.effectiveWidth).toBe(50);
		expect(result.effectiveHeight).toBe(50);
	});

	it("width === minWidth のときは minWidth を返す", () => {
		const result = calcDimensionsWithMinSize(30, 30, 30, 30);
		expect(result.effectiveWidth).toBe(30);
		expect(result.effectiveHeight).toBe(30);
	});

	it("minWidth のみ指定した場合", () => {
		const result = calcDimensionsWithMinSize(10, 100, 50);
		expect(result.effectiveWidth).toBe(50);
		expect(result.effectiveHeight).toBe(100);
	});
});
