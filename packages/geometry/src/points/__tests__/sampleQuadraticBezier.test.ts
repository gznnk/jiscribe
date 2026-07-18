import { describe, it, expect } from "vitest";

import { sampleQuadraticBezier } from "../../points/sampleQuadraticBezier";

describe("sampleQuadraticBezier", () => {
	it("returns segments + 1 points including both endpoints", () => {
		const p0 = { x: 0, y: 0 };
		const p1 = { x: 4, y: 0 };
		const points = sampleQuadraticBezier(p0, { x: 2, y: 4 }, p1, 4);
		expect(points).toHaveLength(5);
		expect(points[0]).toEqual(p0);
		expect(points[4]).toEqual(p1);
	});

	it("samples the apex at the parameter midpoint", () => {
		// p0=(0,0), control=(1,2), p1=(2,0): B(0.5) = (1, 1).
		const points = sampleQuadraticBezier(
			{ x: 0, y: 0 },
			{ x: 1, y: 2 },
			{ x: 2, y: 0 },
			2,
		);
		expect(points[1].x).toBeCloseTo(1);
		expect(points[1].y).toBeCloseTo(1);
	});

	it("restricts sampling to [tStart, tEnd] when given", () => {
		// Same curve: B(0.25) = (0.5, 0.75), B(0.5) = (1, 1).
		const points = sampleQuadraticBezier(
			{ x: 0, y: 0 },
			{ x: 1, y: 2 },
			{ x: 2, y: 0 },
			2,
			0.25,
			0.5,
		);
		expect(points).toHaveLength(3);
		expect(points[0].x).toBeCloseTo(0.5);
		expect(points[0].y).toBeCloseTo(0.75);
		expect(points[2].x).toBeCloseTo(1);
		expect(points[2].y).toBeCloseTo(1);
	});
});
