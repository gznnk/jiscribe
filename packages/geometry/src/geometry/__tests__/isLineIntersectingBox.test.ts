import { describe, it, expect } from "vitest";

import { isLineIntersectingBox } from "../../geometry/isLineIntersectingBox";

const box = {
	left: 0,
	top: 0,
	right: 100,
	bottom: 100,
	center: { x: 50, y: 50 },
	topLeft: { x: 0, y: 0 },
	topRight: { x: 100, y: 0 },
	bottomLeft: { x: 0, y: 100 },
	bottomRight: { x: 100, y: 100 },
};

describe("isLineIntersectingBox", () => {
	it("returns true for a segment crossing the box horizontally", () => {
		expect(
			isLineIntersectingBox({ x: -10, y: 50 }, { x: 110, y: 50 }, box),
		).toBe(true);
	});

	it("returns true for a segment crossing the box vertically", () => {
		expect(
			isLineIntersectingBox({ x: 50, y: -10 }, { x: 50, y: 110 }, box),
		).toBe(true);
	});

	it("returns false for a segment outside the box", () => {
		expect(
			isLineIntersectingBox({ x: -50, y: 50 }, { x: -10, y: 50 }, box),
		).toBe(false);
	});

	it("returns false for a segment fully inside the box, touching no edge", () => {
		expect(isLineIntersectingBox({ x: 10, y: 10 }, { x: 90, y: 90 }, box)).toBe(
			false,
		);
	});

	it("returns true for a segment crossing the box diagonally", () => {
		// Diagonal offset so that it misses the corners.
		expect(
			isLineIntersectingBox({ x: -10, y: 20 }, { x: 110, y: 80 }, box),
		).toBe(true);
	});
});
