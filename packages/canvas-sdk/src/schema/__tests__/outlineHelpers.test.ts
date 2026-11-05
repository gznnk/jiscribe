import type { Point } from "@jiscribe/geometry";
import { describe, it, expect } from "vitest";

import {
	centeredPolygonOutline,
	OUTLINE_CURVE_SEGMENTS,
} from "../outlineHelpers";

/** Top-left-origin builder: the four corners of the box, clockwise. */
const buildBoxCorners = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => [
	{ x, y },
	{ x: x + width, y },
	{ x: x + width, y: y + height },
	{ x, y: y + height },
];

describe("centeredPolygonOutline", () => {
	it("moves the origin to the box center, which is where the outline is read", () => {
		const outline = centeredPolygonOutline(buildBoxCorners);
		expect(outline({ width: 100, height: 60 })).toEqual([
			{ x: -50, y: -30 },
			{ x: 50, y: -30 },
			{ x: 50, y: 30 },
			{ x: -50, y: 30 },
		]);
	});

	it("hands the builder the top-left corner and the full extents", () => {
		const calls: number[][] = [];
		const outline = centeredPolygonOutline((x, y, width, height) => {
			calls.push([x, y, width, height]);
			return [];
		});
		outline({ width: 80, height: 40 });
		expect(calls).toEqual([[-40, -20, 80, 40]]);
	});

	it("collapses to the origin for a zero-sized box rather than going negative", () => {
		const outline = centeredPolygonOutline(buildBoxCorners);
		const points = outline({ width: 0, height: 0 });
		expect(points).toHaveLength(4);
		for (const point of points) {
			expect(point.x).toBeCloseTo(0);
			expect(point.y).toBeCloseTo(0);
		}
	});

	it("passes the builder's point list through untouched", () => {
		const points = [{ x: 1, y: 2 }];
		expect(
			centeredPolygonOutline(() => points)({ width: 10, height: 10 }),
		).toBe(points);
	});
});

describe("OUTLINE_CURVE_SEGMENTS", () => {
	it("is a positive integer, so a curved outline samples at least once", () => {
		expect(Number.isInteger(OUTLINE_CURVE_SEGMENTS)).toBe(true);
		expect(OUTLINE_CURVE_SEGMENTS).toBeGreaterThan(0);
	});
});
