import { describe, it, expect } from "vitest";

import { ARROW_SIZE } from "../ArrowConstants";
import { getArrowLineInset } from "../getArrowLineInset";

describe("getArrowLineInset", () => {
	it("三角系は底辺（ARROW_SIZE）で止める", () => {
		expect(getArrowLineInset("FilledTriangle")).toBe(ARROW_SIZE);
		expect(getArrowLineInset("HollowTriangle")).toBe(ARROW_SIZE);
	});

	it("ConcaveTriangle は後端の凹み（ARROW_SIZE*0.9）で止める", () => {
		expect(getArrowLineInset("ConcaveTriangle")).toBe(ARROW_SIZE * 0.9);
	});

	it("FilledDiamond / Circle は中央（ARROW_SIZE/2）まで食い込ませる", () => {
		expect(getArrowLineInset("FilledDiamond")).toBe(ARROW_SIZE / 2);
		expect(getArrowLineInset("Circle")).toBe(ARROW_SIZE / 2);
	});

	it("HollowDiamond は中空のため後端の頂点（ARROW_SIZE）で止める", () => {
		expect(getArrowLineInset("HollowDiamond")).toBe(ARROW_SIZE);
	});

	it("OpenArrow / None / undefined は短縮しない（0）", () => {
		expect(getArrowLineInset("OpenArrow")).toBe(0);
		expect(getArrowLineInset("None")).toBe(0);
		expect(getArrowLineInset(undefined)).toBe(0);
	});
});
