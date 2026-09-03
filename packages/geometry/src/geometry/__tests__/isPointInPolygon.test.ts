import { describe, expect, it } from "vitest";

import { isPointInPolygon } from "../../geometry/isPointInPolygon";

/** Axis-aligned 10x10 square with its top-left at the origin. */
const square = [
	{ x: 0, y: 0 },
	{ x: 10, y: 0 },
	{ x: 10, y: 10 },
	{ x: 0, y: 10 },
];

/** A diamond inscribed in the same square, so its corners are the square's edge midpoints. */
const diamond = [
	{ x: 5, y: 0 },
	{ x: 10, y: 5 },
	{ x: 5, y: 10 },
	{ x: 0, y: 5 },
];

describe("isPointInPolygon", () => {
	it("accepts a point well inside", () => {
		expect(isPointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
	});

	it("rejects a point outside", () => {
		expect(isPointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
	});

	it("accepts a point on an edge", () => {
		expect(isPointInPolygon({ x: 10, y: 5 }, square)).toBe(true);
	});

	it("accepts a point on a vertex", () => {
		expect(isPointInPolygon({ x: 0, y: 0 }, square)).toBe(true);
	});

	it("rejects the corner region a non-rectangular outline leaves empty", () => {
		// Inside the diamond's bounding box, outside the diamond itself.
		expect(isPointInPolygon({ x: 1, y: 1 }, diamond)).toBe(false);
		expect(isPointInPolygon({ x: 5, y: 5 }, diamond)).toBe(true);
	});

	it("counts a crossing once where a horizontal ray passes through a vertex", () => {
		// y 5 is the height of the left and right vertices of the diamond: counting
		// both edges of either vertex would flip the result twice and report outside.
		expect(isPointInPolygon({ x: 5, y: 5 }, diamond)).toBe(true);
		expect(isPointInPolygon({ x: -1, y: 5 }, diamond)).toBe(false);
	});

	it("treats the overlap of a self-intersecting outline as outside (even-odd)", () => {
		const bowTie = [
			{ x: 0, y: 0 },
			{ x: 10, y: 10 },
			{ x: 0, y: 10 },
			{ x: 10, y: 0 },
		];
		expect(isPointInPolygon({ x: 5, y: 2 }, bowTie)).toBe(true);
		expect(isPointInPolygon({ x: 2, y: 5 }, bowTie)).toBe(false);
	});

	it("encloses nothing with fewer than three vertices", () => {
		expect(
			isPointInPolygon({ x: 5, y: 0 }, [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			]),
		).toBe(false);
	});
});
