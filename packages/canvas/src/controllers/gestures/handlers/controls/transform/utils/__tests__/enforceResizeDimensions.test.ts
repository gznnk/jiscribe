import type { TransformedFrame } from "@jiscribe/geometry";
import { describe, it, expect } from "vitest";

import type { TransformState } from "../../../../../../../states/objects/base/TransformState";
import {
	calcHeightWithAspectRatio,
	calcWidthWithAspectRatio,
	enforceResizeDimensions,
} from "../enforceResizeDimensions";

const makeFrame = (
	minWidth?: number,
	minHeight?: number,
): TransformedFrame & TransformState =>
	({
		cx: 0,
		cy: 0,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		minWidth,
		minHeight,
	}) as TransformedFrame & TransformState;

describe("calcHeightWithAspectRatio", () => {
	it("returns 50 for width=100, ratio=2", () => {
		expect(calcHeightWithAspectRatio(100, 2)).toBe(50);
	});

	it("returns 200 for width=100, ratio=0.5", () => {
		expect(calcHeightWithAspectRatio(100, 0.5)).toBe(200);
	});

	it("returns 0 for width=0", () => {
		expect(calcHeightWithAspectRatio(0, 2)).toBe(0);
	});
});

describe("calcWidthWithAspectRatio", () => {
	it("returns 100 for height=50, ratio=2", () => {
		expect(calcWidthWithAspectRatio(50, 2)).toBe(100);
	});

	it("returns 50 for height=100, ratio=0.5", () => {
		expect(calcWidthWithAspectRatio(100, 0.5)).toBe(50);
	});

	it("returns 0 for height=0", () => {
		expect(calcWidthWithAspectRatio(0, 2)).toBe(0);
	});
});

describe("enforceResizeDimensions", () => {
	describe("within minimums (no clamping needed)", () => {
		it("returns the input values as-is when both width and height are at least the minimum", () => {
			const frame = makeFrame(10, 10);
			expect(enforceResizeDimensions(frame, 50, 50, undefined, false)).toEqual({
				width: 50,
				height: 50,
			});
		});

		it("passes any value through when the minimum is unset (undefined)", () => {
			const frame = makeFrame(undefined, undefined);
			expect(enforceResizeDimensions(frame, 1, 1, undefined, false)).toEqual({
				width: 1,
				height: 1,
			});
		});
	});

	describe("no aspect ratio (shouldKeepProportion=false)", () => {
		it("clamps only the width when the width is below the minimum", () => {
			const frame = makeFrame(20, 20);
			expect(enforceResizeDimensions(frame, 5, 50, undefined, false)).toEqual({
				width: 20,
				height: 50,
			});
		});

		it("clamps only the height when the height is below the minimum", () => {
			const frame = makeFrame(20, 20);
			expect(enforceResizeDimensions(frame, 50, 5, undefined, false)).toEqual({
				width: 50,
				height: 20,
			});
		});

		it("clamps both when both width and height are below the minimum", () => {
			const frame = makeFrame(20, 30);
			expect(enforceResizeDimensions(frame, 5, 5, undefined, false)).toEqual({
				width: 20,
				height: 30,
			});
		});

		it("rounds a negative width up to the minimum while preserving its sign", () => {
			const frame = makeFrame(20, 20);
			const result = enforceResizeDimensions(frame, -5, 50, undefined, false);
			expect(result.width).toBe(-20);
		});
	});

	describe("with aspect ratio (shouldKeepProportion=true)", () => {
		it("returns the width/height derived from the minimums (for ratio=2)", () => {
			const frame = makeFrame(10, 10);
			// ratio=2 -> minWidthFromHeight = 10*2 = 20 > minWidth=10
			// -> adjustedHeight = minHeight = 10, adjustedWidth = 20
			const result = enforceResizeDimensions(frame, 5, 5, 2, true);
			expect(result.width).toBe(20);
			expect(result.height).toBe(10);
		});

		it("behaves the same as no ratio when aspectRatio=undefined", () => {
			const frame = makeFrame(20, 20);
			expect(enforceResizeDimensions(frame, 5, 5, undefined, true)).toEqual({
				width: 20,
				height: 20,
			});
		});
	});
});
