import { describe, it, expect } from "vitest";

import { sampleCubicBezier } from "../../points/sampleCubicBezier";

describe("sampleCubicBezier", () => {
	it("returns segments + 1 points including both endpoints", () => {
		const p0 = { x: 0, y: 0 };
		const p3 = { x: 3, y: 9 };
		const points = sampleCubicBezier(p0, { x: 1, y: 3 }, { x: 2, y: 6 }, p3, 4);
		expect(points).toHaveLength(5);
		expect(points[0]).toEqual(p0);
		expect(points[4].x).toBeCloseTo(3);
		expect(points[4].y).toBeCloseTo(9);
	});

	it("reduces to the straight line when control points are evenly spaced", () => {
		// Controls at 1/3 and 2/3 of a straight segment → uniform linear motion.
		const points = sampleCubicBezier(
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 2, y: 0 },
			{ x: 3, y: 0 },
			2,
		);
		expect(points[1].x).toBeCloseTo(1.5);
		expect(points[1].y).toBeCloseTo(0);
	});
});
