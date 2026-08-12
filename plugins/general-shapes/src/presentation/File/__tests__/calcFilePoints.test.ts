import { describe, it, expect } from "vitest";

import { calcFileFoldSize } from "../calcFileFoldSize";
import { calcFilePoints } from "../calcFilePoints";

describe("calcFilePoints", () => {
	it("returns the five corners clockwise from the top-left", () => {
		// 100x120: min(100 * 0.3, 120 * 0.28) = 30.
		expect(calcFilePoints(0, 0, 100, 120)).toEqual([
			{ x: 0, y: 0 },
			{ x: 70, y: 0 },
			{ x: 100, y: 30 },
			{ x: 100, y: 120 },
			{ x: 0, y: 120 },
		]);
	});

	it("cuts the top-right corner by the fold and leaves the other three square", () => {
		const fold = calcFileFoldSize(100, 120);
		const [topLeft, foldStart, foldEnd, bottomRight, bottomLeft] =
			calcFilePoints(0, 0, 100, 120);
		expect(topLeft).toEqual({ x: 0, y: 0 });
		expect(bottomRight).toEqual({ x: 100, y: 120 });
		expect(bottomLeft).toEqual({ x: 0, y: 120 });
		// The cut runs from the top edge down to the right edge, one fold each way.
		expect(100 - foldStart.x).toBeCloseTo(fold);
		expect(foldEnd.y).toBeCloseTo(fold);
	});

	it("cuts a right isosceles triangle, so the fold reads as a folded corner", () => {
		const points = calcFilePoints(0, 0, 200, 40);
		const [, foldStart, foldEnd] = points;
		expect(200 - foldStart.x).toBeCloseTo(foldEnd.y);
	});

	it("translates with the top-left corner it is given", () => {
		const atOrigin = calcFilePoints(0, 0, 100, 120);
		const centered = calcFilePoints(-50, -60, 100, 120);
		expect(centered).toEqual(
			atOrigin.map(({ x, y }) => ({ x: x - 50, y: y - 60 })),
		);
	});

	it("stays inside the box on every corner", () => {
		for (const { x, y } of calcFilePoints(0, 0, 200, 40)) {
			expect(x).toBeGreaterThanOrEqual(0);
			expect(x).toBeLessThanOrEqual(200);
			expect(y).toBeGreaterThanOrEqual(0);
			expect(y).toBeLessThanOrEqual(40);
		}
	});

	it("degenerates to the plain box when the fold collapses to zero", () => {
		// A zero-width box has no fold, so the cut corners coincide.
		const [, foldStart, foldEnd] = calcFilePoints(0, 0, 0, 120);
		expect(foldStart).toEqual({ x: 0, y: 0 });
		expect(foldEnd).toEqual({ x: 0, y: 0 });
	});
});
