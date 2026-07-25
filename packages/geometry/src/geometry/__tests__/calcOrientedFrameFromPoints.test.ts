import { describe, it, expect, assert } from "vitest";

import { calcOrientedFrameFromPoints } from "../../geometry/calcOrientedFrameFromPoints";

// Signature: calcOrientedFrameFromPoints(points, scaleX=1, scaleY=1, rotationDeg=0)
describe("calcOrientedFrameFromPoints", () => {
	it("returns null for an empty array", () => {
		expect(calcOrientedFrameFromPoints([])).toBeNull();
	});

	it("returns a zero-sized frame for a single point", () => {
		const result = calcOrientedFrameFromPoints([{ x: 10, y: 20 }]);
		assert(result !== null);
		expect(result.cx).toBe(10);
		expect(result.cy).toBe(20);
		expect(result.width).toBe(0);
		expect(result.height).toBe(0);
		expect(result.rotation).toBe(0);
		expect(result.scaleX).toBe(1);
		expect(result.scaleY).toBe(1);
	});

	it("returns an axis-aligned bounding frame when rotation is 0", () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 60 },
			{ x: 0, y: 60 },
		];
		const result = calcOrientedFrameFromPoints(points, 1, 1, 0);
		assert(result !== null);
		expect(result.cx).toBeCloseTo(50);
		expect(result.cy).toBeCloseTo(30);
		expect(result.width).toBeCloseTo(100);
		expect(result.height).toBeCloseTo(60);
		expect(result.rotation).toBe(0);
	});

	it("carries rotation, scaleX and scaleY into the result", () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 60 },
			{ x: 0, y: 60 },
		];
		// Signature: (points, scaleX, scaleY, rotation)
		const result = calcOrientedFrameFromPoints(points, -1, 1, 45);
		assert(result !== null);
		expect(result.rotation).toBe(45);
		expect(result.scaleX).toBe(-1);
		expect(result.scaleY).toBe(1);
	});

	it("swaps width and height from the inverse-transformed box when rotated 90 degrees", () => {
		// A 100x60 rectangle: the rotation-90 inverse swaps the axes, giving width=60 and
		// height=100. The center stays at (50, 30).
		const points = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 60 },
			{ x: 0, y: 60 },
		];
		const result = calcOrientedFrameFromPoints(points, 1, 1, 90);
		assert(result !== null);
		expect(result.cx).toBeCloseTo(50);
		expect(result.cy).toBeCloseTo(30);
		expect(result.width).toBeCloseTo(60);
		expect(result.height).toBeCloseTo(100);
	});

	// Regression: spreading into Math.min/max can throw RangeError (maximum call stack
	// size exceeded) on large point sets, so the single-pass loop must survive them.
	it("returns the correct box for hundreds of thousands of points without a RangeError", () => {
		const count = 200_000;
		const points = Array.from({ length: count }, (_, i) => ({
			x: i,
			y: count - i,
		}));
		const result = calcOrientedFrameFromPoints(points);
		assert(result !== null);
		// x: 0..count-1, y: 1..count
		expect(result.cx).toBeCloseTo((count - 1) / 2);
		expect(result.cy).toBeCloseTo((count + 1) / 2);
		expect(result.width).toBeCloseTo(count - 1);
		expect(result.height).toBeCloseTo(count - 1);
	});
});
