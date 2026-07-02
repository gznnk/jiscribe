import { describe, it, expect } from "vitest";

import { ARROW_SIZE } from "../ArrowConstants";
import { getArrowLineInset } from "../getArrowLineInset";

describe("getArrowLineInset", () => {
	it("triangle types stop at the base (ARROW_SIZE)", () => {
		expect(getArrowLineInset("FilledTriangle")).toBe(ARROW_SIZE);
		expect(getArrowLineInset("HollowTriangle")).toBe(ARROW_SIZE);
	});

	it("ConcaveTriangle stops at the rear notch (ARROW_SIZE*0.9)", () => {
		expect(getArrowLineInset("ConcaveTriangle")).toBe(ARROW_SIZE * 0.9);
	});

	it("FilledDiamond / Circle inset up to the center (ARROW_SIZE/2)", () => {
		expect(getArrowLineInset("FilledDiamond")).toBe(ARROW_SIZE / 2);
		expect(getArrowLineInset("Circle")).toBe(ARROW_SIZE / 2);
	});

	it("HollowDiamond, being hollow, stops at the rear vertex (ARROW_SIZE)", () => {
		expect(getArrowLineInset("HollowDiamond")).toBe(ARROW_SIZE);
	});

	it("OpenArrow / None / undefined do not shorten (0)", () => {
		expect(getArrowLineInset("OpenArrow")).toBe(0);
		expect(getArrowLineInset("None")).toBe(0);
		expect(getArrowLineInset(undefined)).toBe(0);
	});
});
