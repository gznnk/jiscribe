import { describe, it, expect } from "vitest";

import { castRayOnPolygon } from "../../points/castRayOnPolygon";
import type { Point } from "../../types/Point";

/** Axis-aligned square, side 20, centered at the origin. */
const square: Point[] = [
	{ x: -10, y: -10 },
	{ x: 10, y: -10 },
	{ x: 10, y: 10 },
	{ x: -10, y: 10 },
];

describe("castRayOnPolygon", () => {
	it("returns null for an empty polygon", () => {
		expect(castRayOnPolygon([], 0, 0, 1, 0)).toBeNull();
	});

	it("returns null for a zero direction, which has no ray to cast", () => {
		expect(castRayOnPolygon(square, 0, 0, 0, 0)).toBeNull();
	});

	it("hits the edge the direction points at, from inside", () => {
		const hit = castRayOnPolygon(square, 0, 0, 1, 0);
		expect(hit?.x).toBeCloseTo(10);
		expect(hit?.y).toBeCloseTo(0);
	});

	it("ignores the direction's magnitude, which is not required to be normalized", () => {
		expect(castRayOnPolygon(square, 0, 0, 1, 0)).toEqual(
			castRayOnPolygon(square, 0, 0, 1000, 0),
		);
	});

	it("takes the nearest crossing ahead of the origin, not the far side", () => {
		// From outside on the left, both x=-10 and x=10 are ahead: the near one wins.
		const hit = castRayOnPolygon(square, -100, 0, 1, 0);
		expect(hit?.x).toBeCloseTo(-10);
		expect(hit?.y).toBeCloseTo(0);
	});

	it("ignores crossings behind the origin", () => {
		// The square is entirely to the left, so a rightward ray never reaches it.
		expect(castRayOnPolygon(square, 100, 0, 1, 0)).toBeNull();
	});

	it("closes the polygon, so the last-to-first edge can be hit", () => {
		// Only the closing edge (-10,10) -> (-10,-10) lies to the left of center.
		const hit = castRayOnPolygon(square, 0, 0, -1, 0);
		expect(hit?.x).toBeCloseTo(-10);
		expect(hit?.y).toBeCloseTo(0);
	});

	it("hits a diagonal edge at the crossing rather than at a vertex", () => {
		const triangle: Point[] = [
			{ x: 0, y: -10 },
			{ x: 10, y: 10 },
			{ x: -10, y: 10 },
		];
		// Up-and-right at 45° from the centroid area crosses the right slanted edge.
		const hit = castRayOnPolygon(triangle, 0, 0, 1, -1);
		expect(hit?.x).toBeCloseTo(10 / 3);
		expect(hit?.y).toBeCloseTo(-10 / 3);
	});

	it("takes the nearest crossing of a concave outline", () => {
		// Square with a triangular notch cut into the right side down to x=2.
		const notched: Point[] = [
			{ x: -10, y: -10 },
			{ x: 10, y: -10 },
			{ x: 2, y: 0 },
			{ x: 10, y: 10 },
			{ x: -10, y: 10 },
		];
		const hit = castRayOnPolygon(notched, -10, 0, 1, 0);
		expect(hit?.x).toBeCloseTo(2);
		expect(hit?.y).toBeCloseTo(0);
	});

	it("skips an edge the ray runs parallel to", () => {
		// A ray along y=-10 is parallel to both horizontal edges; only the two
		// vertical edges can be crossed, and the near one is x=-10.
		const hit = castRayOnPolygon(square, -100, -10, 1, 0);
		expect(hit?.x).toBeCloseTo(-10);
		expect(hit?.y).toBeCloseTo(-10);
	});

	it("returns null when the ray misses the polygon entirely", () => {
		expect(castRayOnPolygon(square, -100, 50, 1, 0)).toBeNull();
	});

	it("travels past the edge its origin lies on", () => {
		// Origin on the left edge, heading right: that edge does not count as a hit,
		// so the ray carries on to the opposite one.
		const hit = castRayOnPolygon(square, -10, 0, 1, 0);
		expect(hit?.x).toBeCloseTo(10);
		expect(hit?.y).toBeCloseTo(0);
	});

	it("hits a vertex the ray passes exactly through", () => {
		const hit = castRayOnPolygon(square, 0, 0, 1, 1);
		expect(hit?.x).toBeCloseTo(10);
		expect(hit?.y).toBeCloseTo(10);
	});

	it("returns null for a degenerate polygon with no area", () => {
		// A single point, and a two-vertex "polygon" whose edges are collinear with
		// the ray, leave nothing to cross.
		expect(castRayOnPolygon([{ x: 0, y: 0 }], -10, 0, 1, 0)).toBeNull();
		expect(
			castRayOnPolygon(
				[
					{ x: 0, y: 0 },
					{ x: 10, y: 0 },
				],
				-10,
				0,
				1,
				0,
			),
		).toBeNull();
	});

	it("crosses a two-vertex segment, which closes back on itself", () => {
		// The closing edge retraces the first, so a crossing ray still hits it.
		const hit = castRayOnPolygon(
			[
				{ x: 0, y: -10 },
				{ x: 0, y: 10 },
			],
			-5,
			0,
			1,
			0,
		);
		expect(hit?.x).toBeCloseTo(0);
		expect(hit?.y).toBeCloseTo(0);
	});
});
