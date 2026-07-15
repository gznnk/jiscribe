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
});
