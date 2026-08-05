import { describe, expect, it } from "vitest";

import {
	calcCalloutPolygon,
	calcCalloutTailTipPoint,
} from "../calloutTailGeometry";

describe("calcCalloutTailTipPoint", () => {
	it("places the tip on each side's bounding-box edge at the given position", () => {
		expect(
			calcCalloutTailTipPoint(100, 80, { side: "bottom", position: 0.2 }),
		).toEqual({ x: -30, y: 40 });
		expect(
			calcCalloutTailTipPoint(100, 80, { side: "top", position: 0.5 }),
		).toEqual({ x: 0, y: -40 });
		expect(
			calcCalloutTailTipPoint(100, 80, { side: "left", position: 0.25 }),
		).toEqual({ x: -50, y: -20 });
		expect(
			calcCalloutTailTipPoint(100, 80, { side: "right", position: 1 }),
		).toEqual({ x: 50, y: 40 });
	});

	it("clamps position to [0, 1]", () => {
		expect(
			calcCalloutTailTipPoint(100, 80, { side: "bottom", position: 2 }),
		).toEqual({ x: 50, y: 40 });
	});
});

describe("calcCalloutPolygon", () => {
	it("keeps the whole silhouette inside the bounding box (all sides)", () => {
		for (const side of ["top", "right", "bottom", "left"] as const) {
			const points = calcCalloutPolygon(0, 0, 100, 80, {
				side,
				position: 0.3,
			});
			expect(points).toHaveLength(7);
			for (const point of points) {
				expect(point.x).toBeGreaterThanOrEqual(0);
				expect(point.x).toBeLessThanOrEqual(100);
				expect(point.y).toBeGreaterThanOrEqual(0);
				expect(point.y).toBeLessThanOrEqual(80);
			}
		}
	});

	it("bottom tail (first half): tip follows position, base sits in the start slot", () => {
		const points = calcCalloutPolygon(0, 0, 100, 80, {
			side: "bottom",
			position: 0.2,
		});
		// body bottom = 80 * (1 - 0.25) = 60,
		// start slot center = 100 * 0.3 = 30, base half = 100 * 0.2 / 2 = 10
		expect(points).toContainEqual({ x: 20, y: 80 }); // tip
		expect(points).toContainEqual({ x: 20, y: 60 }); // base start
		expect(points).toContainEqual({ x: 40, y: 60 }); // base end
	});

	it("right tail (second half): body is inset on the right, base sits in the end slot", () => {
		const points = calcCalloutPolygon(0, 0, 100, 80, {
			side: "right",
			position: 0.5,
		});
		// body right = 100 - 100 * 0.25 = 75,
		// end slot center = 80 * 0.7 = 56, base half = 80 * 0.2 / 2 = 8
		expect(points).toContainEqual({ x: 100, y: 40 }); // tip
		expect(points).toContainEqual({ x: 75, y: 48 }); // base start
		expect(points).toContainEqual({ x: 75, y: 64 }); // base end
	});

	it("keeps the base in its fixed slot even when the tip is at a corner", () => {
		const points = calcCalloutPolygon(0, 0, 100, 80, {
			side: "bottom",
			position: 0,
		});
		expect(points).toContainEqual({ x: 0, y: 80 }); // tip at the corner
		expect(points).toContainEqual({ x: 20, y: 60 }); // start slot, not following the tip
		expect(points).toContainEqual({ x: 40, y: 60 });
	});
});
