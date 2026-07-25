import { describe, it, expect } from "vitest";

import { calcBoundingBox } from "../../geometry/calcBoundingBox";

describe("calcBoundingBox", () => {
	it("derives the box straight from the center when unrotated", () => {
		const result = calcBoundingBox({
			cx: 100,
			cy: 50,
			width: 80,
			height: 40,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		});
		expect(result.left).toBeCloseTo(60);
		expect(result.right).toBeCloseTo(140);
		expect(result.top).toBeCloseTo(30);
		expect(result.bottom).toBeCloseTo(70);
	});

	it("handles an unrotated square centered on the origin", () => {
		const result = calcBoundingBox({
			cx: 0,
			cy: 0,
			width: 100,
			height: 100,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		});
		expect(result.left).toBeCloseTo(-50);
		expect(result.right).toBeCloseTo(50);
		expect(result.top).toBeCloseTo(-50);
		expect(result.bottom).toBeCloseTo(50);
	});

	it("computes the box of a rectangle rotated 90 degrees", () => {
		const result = calcBoundingBox({
			cx: 0,
			cy: 0,
			width: 100,
			height: 40,
			rotation: 90,
			scaleX: 1,
			scaleY: 1,
		});
		// A 90 degree rotation swaps width and height.
		expect(result.left).toBeCloseTo(-20);
		expect(result.right).toBeCloseTo(20);
		expect(result.top).toBeCloseTo(-50);
		expect(result.bottom).toBeCloseTo(50);
	});

	it("grows the box for a square rotated 45 degrees", () => {
		const size = 100;
		const result = calcBoundingBox({
			cx: 0,
			cy: 0,
			width: size,
			height: size,
			rotation: 45,
			scaleX: 1,
			scaleY: 1,
		});
		// The box of a square rotated 45 degrees has side size*sqrt(2).
		const expected = (size / 2) * Math.SQRT2;
		expect(result.left).toBeCloseTo(-expected);
		expect(result.right).toBeCloseTo(expected);
	});
});
