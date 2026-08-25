import { describe, it, expect } from "vitest";

import { AUTO_SCROLL_STEP_SIZE } from "../../GestureRecognizerConstants";
import { calculateScrollDelta } from "../calculateScrollDelta";

const S = AUTO_SCROLL_STEP_SIZE;

describe("calculateScrollDelta", () => {
	describe("no edge (null/null)", () => {
		it("returns deltaX=0, deltaY=0 when horizontal=null, vertical=null", () => {
			expect(calculateScrollDelta(null, null)).toEqual({
				deltaX: 0,
				deltaY: 0,
			});
		});
	});

	describe("horizontal only", () => {
		it("deltaX becomes negative for left", () => {
			expect(calculateScrollDelta("left", null)).toEqual({
				deltaX: -S,
				deltaY: 0,
			});
		});

		it("deltaX becomes positive for right", () => {
			expect(calculateScrollDelta("right", null)).toEqual({
				deltaX: S,
				deltaY: 0,
			});
		});
	});

	describe("vertical only", () => {
		it("deltaY becomes negative for top", () => {
			expect(calculateScrollDelta(null, "top")).toEqual({
				deltaX: 0,
				deltaY: -S,
			});
		});

		it("deltaY becomes positive for bottom", () => {
			expect(calculateScrollDelta(null, "bottom")).toEqual({
				deltaX: 0,
				deltaY: S,
			});
		});
	});

	describe("diagonal (both specified)", () => {
		it("both become negative for left + top", () => {
			expect(calculateScrollDelta("left", "top")).toEqual({
				deltaX: -S,
				deltaY: -S,
			});
		});

		it("deltaX negative, deltaY positive for left + bottom", () => {
			expect(calculateScrollDelta("left", "bottom")).toEqual({
				deltaX: -S,
				deltaY: S,
			});
		});

		it("deltaX positive, deltaY negative for right + top", () => {
			expect(calculateScrollDelta("right", "top")).toEqual({
				deltaX: S,
				deltaY: -S,
			});
		});

		it("both become positive for right + bottom", () => {
			expect(calculateScrollDelta("right", "bottom")).toEqual({
				deltaX: S,
				deltaY: S,
			});
		});
	});
});
