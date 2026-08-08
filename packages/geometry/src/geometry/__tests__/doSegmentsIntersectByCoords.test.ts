import { describe, it, expect } from "vitest";

import { doSegmentsIntersectByCoords } from "../../geometry/doSegmentsIntersectByCoords";

describe("doSegmentsIntersectByCoords", () => {
	it("returns true for segments crossing in an X", () => {
		const result = doSegmentsIntersectByCoords(0, 0, 2, 2, 0, 2, 2, 0, false);
		expect(result).toBe(true);
	});

	it("returns false for parallel segments", () => {
		const result = doSegmentsIntersectByCoords(0, 0, 2, 0, 0, 1, 2, 1, false);
		expect(result).toBe(false);
	});

	it("returns false for colinear segments", () => {
		const result = doSegmentsIntersectByCoords(0, 0, 2, 0, 1, 0, 3, 0, false);
		expect(result).toBe(false);
	});

	it("returns true for a T intersection when inclusive is true", () => {
		const result = doSegmentsIntersectByCoords(1, 0, 1, 2, 0, 1, 2, 1, true);
		expect(result).toBe(true);
	});

	it("returns false for a T intersection when inclusive is false", () => {
		// t=0.5 (interior), u=0 (endpoint), so not an intersection when exclusive.
		const result = doSegmentsIntersectByCoords(0, 0, 2, 0, 1, 0, 1, 2, false);
		expect(result).toBe(false);
	});

	it("returns false for clearly disjoint segments", () => {
		const result = doSegmentsIntersectByCoords(0, 0, 1, 0, 3, 0, 4, 0, false);
		expect(result).toBe(false);
	});

	it("returns true for an interior crossing even when inclusive is false", () => {
		// Perpendicular at both midpoints (t=0.5, u=0.5): a true crossing, no endpoints involved.
		const result = doSegmentsIntersectByCoords(0, 1, 2, 1, 1, 0, 1, 2, false);
		expect(result).toBe(true);
	});
});
