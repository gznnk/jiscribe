import { describe, expect, it } from "vitest";

import { ARROW_SIZE } from "../ArrowConstants";
import { calcArrowLineInset } from "../calcArrowLineInset";

describe("calcArrowLineInset", () => {
	it("scales the type's own inset by strokeWidth × arrowScale", () => {
		expect(calcArrowLineInset("HollowTriangle", 8, 0.3)).toBeCloseTo(
			ARROW_SIZE * 8 * 0.3,
			9,
		);
	});

	it("stops the line one stroke width short of a thinned OpenArrow's tip, where its arms stand that far apart", () => {
		expect(calcArrowLineInset("OpenArrow", 8, 0.3)).toBeCloseTo(8, 9);
		expect(calcArrowLineInset("OpenArrow", 8, 0.2)).toBeCloseTo(8, 9);
	});

	it("runs the line to an OpenArrow's tip from the thinning scale up", () => {
		expect(calcArrowLineInset("OpenArrow", 8, 0.5)).toBe(0);
		expect(calcArrowLineInset("OpenArrow", 8, 1)).toBe(0);
	});

	it("stops nothing short without a head", () => {
		expect(calcArrowLineInset(undefined, 8, 0.3)).toBe(0);
		expect(calcArrowLineInset("None", 8, 0.3)).toBe(0);
	});
});
