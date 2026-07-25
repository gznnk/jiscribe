import { describe, it, expect } from "vitest";

import { calcRotatedPoint } from "../calcRotatedPoint";

describe("calcRotatedPoint", () => {
	it("returns the point unchanged for a 0 radian rotation", () => {
		const result = calcRotatedPoint(1, 0, 0, 0, 0);
		expect(result.x).toBeCloseTo(1);
		expect(result.y).toBeCloseTo(0);
	});

	it("rotates 90 degrees (π/2) about the origin", () => {
		// (1, 0) rotated 90 degrees about the origin -> (0, 1)
		const result = calcRotatedPoint(1, 0, 0, 0, Math.PI / 2);
		expect(result.x).toBeCloseTo(0);
		expect(result.y).toBeCloseTo(1);
	});

	it("rotates 180 degrees (π) about the origin", () => {
		// (1, 0) rotated 180 degrees about the origin -> (-1, 0)
		const result = calcRotatedPoint(1, 0, 0, 0, Math.PI);
		expect(result.x).toBeCloseTo(-1);
		expect(result.y).toBeCloseTo(0);
	});

	it("rotates about an arbitrary center", () => {
		// (2, 0) rotated 90 degrees about (1, 0) -> (1, 1)
		const result = calcRotatedPoint(2, 0, 1, 0, Math.PI / 2);
		expect(result.x).toBeCloseTo(1);
		expect(result.y).toBeCloseTo(1);
	});
});
