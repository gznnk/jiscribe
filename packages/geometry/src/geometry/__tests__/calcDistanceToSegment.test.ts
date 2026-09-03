import { describe, expect, it } from "vitest";

import { calcDistanceToSegment } from "../../geometry/calcDistanceToSegment";

describe("calcDistanceToSegment", () => {
	it("measures perpendicularly where the projection falls inside the segment", () => {
		expect(
			calcDistanceToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
		).toBe(3);
	});

	it("measures to the near end where the projection falls past it", () => {
		// The infinite line would report 3; the segment ends at x 10.
		expect(
			calcDistanceToSegment({ x: 14, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
		).toBe(5);
	});

	it("measures to the start where the projection falls before it", () => {
		expect(
			calcDistanceToSegment({ x: -4, y: -3 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
		).toBe(5);
	});

	it("returns 0 for a point on the segment", () => {
		expect(
			calcDistanceToSegment({ x: 4, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
		).toBe(0);
	});

	it("measures to the point a degenerate segment collapses to", () => {
		expect(
			calcDistanceToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 }),
		).toBe(5);
	});
});
