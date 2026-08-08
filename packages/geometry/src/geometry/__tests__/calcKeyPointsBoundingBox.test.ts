import { describe, it, expect } from "vitest";

import { calcKeyPointsBoundingBox } from "../../geometry/calcKeyPointsBoundingBox";

describe("calcKeyPointsBoundingBox", () => {
	it("computes the box from the key points of an axis-aligned rectangle", () => {
		const keyPoints = {
			topLeft: { x: 0, y: 0 },
			topCenter: { x: 50, y: 0 },
			topRight: { x: 100, y: 0 },
			rightCenter: { x: 100, y: 30 },
			bottomRight: { x: 100, y: 60 },
			bottomCenter: { x: 50, y: 60 },
			bottomLeft: { x: 0, y: 60 },
			leftCenter: { x: 0, y: 30 },
		};
		const result = calcKeyPointsBoundingBox(keyPoints);
		expect(result.left).toBe(0);
		expect(result.right).toBe(100);
		expect(result.top).toBe(0);
		expect(result.bottom).toBe(60);
	});

	it("computes the box from the key points of a rotated rectangle", () => {
		// Vertices of a square with side 100 rotated 45 degrees.
		const d = 50 * Math.SQRT2;
		const keyPoints = {
			topLeft: { x: 0, y: -d },
			topCenter: { x: d / 2, y: -d / 2 },
			topRight: { x: d, y: 0 },
			rightCenter: { x: d / 2, y: d / 2 },
			bottomRight: { x: 0, y: d },
			bottomCenter: { x: -d / 2, y: d / 2 },
			bottomLeft: { x: -d, y: 0 },
			leftCenter: { x: -d / 2, y: -d / 2 },
		};
		const result = calcKeyPointsBoundingBox(keyPoints);
		expect(result.left).toBeCloseTo(-d);
		expect(result.right).toBeCloseTo(d);
		expect(result.top).toBeCloseTo(-d);
		expect(result.bottom).toBeCloseTo(d);
	});
});
