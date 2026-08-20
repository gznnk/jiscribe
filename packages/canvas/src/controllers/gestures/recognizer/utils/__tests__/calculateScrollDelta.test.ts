import { describe, it, expect } from "vitest";

import {
	AUTO_SCROLL_REFERENCE_FRAME_MS,
	AUTO_SCROLL_STEP_SIZE,
} from "../../GestureRecognizerConstants";
import { calculateScrollDelta } from "../calculateScrollDelta";

const S = AUTO_SCROLL_STEP_SIZE;
// One reference frame yields exactly the quoted step.
const FRAME = AUTO_SCROLL_REFERENCE_FRAME_MS;

describe("calculateScrollDelta", () => {
	describe("no edge (null/null)", () => {
		it("returns deltaX=0, deltaY=0 when horizontal=null, vertical=null", () => {
			expect(calculateScrollDelta(null, null, FRAME)).toEqual({
				deltaX: 0,
				deltaY: 0,
			});
		});
	});

	describe("horizontal only", () => {
		it("deltaX becomes negative for left", () => {
			expect(calculateScrollDelta("left", null, FRAME)).toEqual({
				deltaX: -S,
				deltaY: 0,
			});
		});

		it("deltaX becomes positive for right", () => {
			expect(calculateScrollDelta("right", null, FRAME)).toEqual({
				deltaX: S,
				deltaY: 0,
			});
		});
	});

	describe("vertical only", () => {
		it("deltaY becomes negative for top", () => {
			expect(calculateScrollDelta(null, "top", FRAME)).toEqual({
				deltaX: 0,
				deltaY: -S,
			});
		});

		it("deltaY becomes positive for bottom", () => {
			expect(calculateScrollDelta(null, "bottom", FRAME)).toEqual({
				deltaX: 0,
				deltaY: S,
			});
		});
	});

	describe("diagonal (both specified)", () => {
		it("both become negative for left + top", () => {
			expect(calculateScrollDelta("left", "top", FRAME)).toEqual({
				deltaX: -S,
				deltaY: -S,
			});
		});

		it("deltaX negative, deltaY positive for left + bottom", () => {
			expect(calculateScrollDelta("left", "bottom", FRAME)).toEqual({
				deltaX: -S,
				deltaY: S,
			});
		});

		it("deltaX positive, deltaY negative for right + top", () => {
			expect(calculateScrollDelta("right", "top", FRAME)).toEqual({
				deltaX: S,
				deltaY: -S,
			});
		});

		it("both become positive for right + bottom", () => {
			expect(calculateScrollDelta("right", "bottom", FRAME)).toEqual({
				deltaX: S,
				deltaY: S,
			});
		});
	});

	describe("time scaling", () => {
		it("a tick covering two reference frames scrolls twice the step", () => {
			expect(calculateScrollDelta("right", null, FRAME * 2)).toEqual({
				deltaX: S * 2,
				deltaY: 0,
			});
		});

		it("a tick covering half a reference frame scrolls half the step", () => {
			const { deltaX, deltaY } = calculateScrollDelta(
				null,
				"bottom",
				FRAME / 2,
			);
			expect(deltaX).toBe(0);
			expect(deltaY).toBeCloseTo(S / 2);
		});

		it("a zero-length tick scrolls nothing even at an edge", () => {
			expect(calculateScrollDelta("left", "top", 0)).toEqual({
				deltaX: -0,
				deltaY: -0,
			});
		});

		it("both axes of a diagonal scale by the same elapsed time", () => {
			const { deltaX, deltaY } = calculateScrollDelta(
				"right",
				"bottom",
				FRAME * 1.5,
			);
			expect(deltaX).toBeCloseTo(S * 1.5);
			expect(deltaY).toBeCloseTo(S * 1.5);
		});
	});
});
