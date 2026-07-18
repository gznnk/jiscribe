import { describe, it, expect } from "vitest";

import { sampleEllipseArc } from "../../points/sampleEllipseArc";

describe("sampleEllipseArc", () => {
	it("returns segments + 1 points including both endpoints", () => {
		const points = sampleEllipseArc(0, 0, 10, 10, 0, 90, 4);
		expect(points).toHaveLength(5);
		expect(points[0].x).toBeCloseTo(10);
		expect(points[0].y).toBeCloseTo(0);
		expect(points[4].x).toBeCloseTo(0);
		expect(points[4].y).toBeCloseTo(10);
	});

	it("samples the arc midpoint on the ellipse", () => {
		const points = sampleEllipseArc(0, 0, 10, 20, 0, 90, 2);
		// midpoint at 45°: (10·cos45, 20·sin45)
		expect(points[1].x).toBeCloseTo(10 * Math.SQRT1_2);
		expect(points[1].y).toBeCloseTo(20 * Math.SQRT1_2);
	});

	it("honors the ellipse center offset", () => {
		const points = sampleEllipseArc(5, -3, 4, 4, 180, 180, 1);
		expect(points[0].x).toBeCloseTo(1);
		expect(points[0].y).toBeCloseTo(-3);
	});
});
