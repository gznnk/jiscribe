import { describe, it, expect } from "vitest";

import { doSegmentsIntersect } from "../../geometry/doSegmentsIntersect";

describe("doSegmentsIntersect", () => {
	it("returns true for segments crossing in an X", () => {
		const result = doSegmentsIntersect(
			{ x: 0, y: 0 },
			{ x: 2, y: 2 },
			{ x: 0, y: 2 },
			{ x: 2, y: 0 },
		);
		expect(result).toBe(true);
	});

	it("returns false for parallel segments", () => {
		const result = doSegmentsIntersect(
			{ x: 0, y: 0 },
			{ x: 2, y: 0 },
			{ x: 0, y: 1 },
			{ x: 2, y: 1 },
		);
		expect(result).toBe(false);
	});

	it("returns false for colinear segments", () => {
		const result = doSegmentsIntersect(
			{ x: 0, y: 0 },
			{ x: 2, y: 0 },
			{ x: 1, y: 0 },
			{ x: 3, y: 0 },
		);
		expect(result).toBe(false);
	});

	it("returns false for colinear segments touching at an endpoint, even when inclusive", () => {
		const result = doSegmentsIntersect(
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 1, y: 0 },
			{ x: 2, y: 0 },
			true,
		);
		// Colinear, so false.
		expect(result).toBe(false);
	});

	it("returns true for a T intersection when inclusive", () => {
		const result = doSegmentsIntersect(
			{ x: 1, y: 0 },
			{ x: 1, y: 2 },
			{ x: 0, y: 1 },
			{ x: 2, y: 1 },
			true,
		);
		expect(result).toBe(true);
	});

	it("returns false for a T intersection when not inclusive", () => {
		// Touching at an endpoint does not count when inclusive is false.
		const result = doSegmentsIntersect(
			{ x: 0, y: 0 },
			{ x: 2, y: 0 },
			{ x: 1, y: 0 },
			{ x: 1, y: 2 },
			false,
		);
		// t=0.5 (interior), u=0 (endpoint), so false.
		expect(result).toBe(false);
	});

	it("returns false for clearly disjoint segments", () => {
		const result = doSegmentsIntersect(
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 3, y: 0 },
			{ x: 4, y: 0 },
		);
		expect(result).toBe(false);
	});
});
