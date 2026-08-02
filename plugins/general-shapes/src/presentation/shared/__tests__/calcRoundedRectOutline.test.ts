import { describe, it, expect } from "vitest";

import { calcRoundedRectOutline } from "../calcRoundedRectOutline";

describe("calcRoundedRectOutline", () => {
	it("touches each edge at its midpoint and stays inside the box", () => {
		const points = calcRoundedRectOutline(100, 60, 10);
		expect(Math.max(...points.map((point) => point.x))).toBeCloseTo(50);
		expect(Math.max(...points.map((point) => point.y))).toBeCloseTo(30);
		for (const point of points) {
			expect(Math.abs(point.x)).toBeLessThanOrEqual(50.0001);
			expect(Math.abs(point.y)).toBeLessThanOrEqual(30.0001);
		}
	});

	it("cuts the corner by the radius instead of reaching it", () => {
		const points = calcRoundedRectOutline(100, 60, 10);
		const corner = Math.max(
			...points.map((point) => Math.hypot(point.x, point.y)),
		);
		// A square corner would be at 58.3; rounding pulls it in.
		expect(corner).toBeLessThan(Math.hypot(50, 30));
	});

	it("clamps the radius to half the shorter side, matching buildRoundedRectPath", () => {
		expect(calcRoundedRectOutline(100, 60, 999)).toEqual(
			calcRoundedRectOutline(100, 60, 30),
		);
	});

	it("degenerates to the four box corners at radius 0", () => {
		const points = calcRoundedRectOutline(100, 60, 0);
		const distinct = new Set(points.map((point) => `${point.x},${point.y}`));
		expect(distinct).toEqual(new Set(["50,-30", "50,30", "-50,30", "-50,-30"]));
	});
});
