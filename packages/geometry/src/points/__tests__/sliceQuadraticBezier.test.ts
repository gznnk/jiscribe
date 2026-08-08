import { describe, expect, it } from "vitest";

import { sampleQuadraticBezier } from "../sampleQuadraticBezier";
import { sliceQuadraticBezier } from "../sliceQuadraticBezier";

const p0 = { x: 0, y: 0 };
const control = { x: 40, y: 60 };
const p1 = { x: 100, y: 20 };

describe("sliceQuadraticBezier", () => {
	it("traces the same path as the range it was cut from", () => {
		const sliced = sliceQuadraticBezier(p0, control, p1, 0.2, 0.7);
		const slicedPoints = sampleQuadraticBezier(
			sliced.p0,
			sliced.control,
			sliced.p1,
			8,
		);
		const sourcePoints = sampleQuadraticBezier(p0, control, p1, 8, 0.2, 0.7);
		slicedPoints.forEach((point, index) => {
			expect(point.x).toBeCloseTo(sourcePoints[index].x, 10);
			expect(point.y).toBeCloseTo(sourcePoints[index].y, 10);
		});
	});

	it("returns the original control points for the full range", () => {
		const sliced = sliceQuadraticBezier(p0, control, p1, 0, 1);
		expect(sliced.p0).toEqual(p0);
		expect(sliced.control).toEqual(control);
		expect(sliced.p1).toEqual(p1);
	});

	it("collapses to a point when both ends are the same t", () => {
		const sliced = sliceQuadraticBezier(p0, control, p1, 0.5, 0.5);
		expect(sliced.control.x).toBeCloseTo(sliced.p0.x, 10);
		expect(sliced.control.y).toBeCloseTo(sliced.p0.y, 10);
		expect(sliced.p1).toEqual(sliced.p0);
	});
});
