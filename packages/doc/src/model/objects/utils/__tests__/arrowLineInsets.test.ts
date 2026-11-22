import { describe, expect, it } from "vitest";

import { ARROW_SIZE } from "../arrowHeadDimensions";
import { calcArrowLineInset, getArrowLineInset } from "../arrowLineInsets";

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

	it("HollowCircle, being hollow, stops at the far edge (ARROW_SIZE)", () => {
		expect(getArrowLineInset("HollowCircle")).toBe(ARROW_SIZE);
	});

	it("OpenArrow / Cross / None / undefined do not shorten (0)", () => {
		expect(getArrowLineInset("OpenArrow")).toBe(0);
		expect(getArrowLineInset("Cross")).toBe(0);
		expect(getArrowLineInset("None")).toBe(0);
		expect(getArrowLineInset(undefined)).toBe(0);
	});

	it("every crow's foot mark is inset, since it draws its own spine", () => {
		expect(getArrowLineInset("CrowFootMany")).toBe(ARROW_SIZE);
		expect(getArrowLineInset("CrowFootOneMany")).toBeGreaterThan(ARROW_SIZE);
		expect(getArrowLineInset("CrowFootOne")).toBeGreaterThan(0);
		expect(getArrowLineInset("CrowFootZeroMany")).toBeGreaterThan(
			getArrowLineInset("CrowFootOneMany"),
		);
		expect(getArrowLineInset("CrowFootZeroOne")).toBeGreaterThan(
			getArrowLineInset("CrowFootOne"),
		);
	});

	it("the zero circle lengthens a mark by its diameter", () => {
		const circleDiameter =
			getArrowLineInset("CrowFootZeroMany") -
			getArrowLineInset("CrowFootOneMany");
		expect(circleDiameter).toBeGreaterThan(0);
		expect(
			getArrowLineInset("CrowFootZeroOne") - getArrowLineInset("CrowFootOne"),
		).toBeCloseTo(circleDiameter);
	});
});

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
