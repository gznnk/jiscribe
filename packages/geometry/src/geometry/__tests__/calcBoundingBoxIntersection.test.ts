import { describe, expect, it } from "vitest";

import { calcBoundingBoxIntersection } from "../../geometry/calcBoundingBoxIntersection";

describe("calcBoundingBoxIntersection", () => {
	it("returns the shared part of two overlapping boxes", () => {
		expect(
			calcBoundingBoxIntersection(
				{ left: 0, top: 0, right: 10, bottom: 10 },
				{ left: 4, top: -5, right: 20, bottom: 6 },
			),
		).toEqual({ left: 4, top: 0, right: 10, bottom: 6 });
	});

	it("returns a copy of the inner box when one contains the other", () => {
		const inner = { left: 2, top: 2, right: 3, bottom: 3 };
		const result = calcBoundingBoxIntersection(
			{ left: 0, top: 0, right: 10, bottom: 10 },
			inner,
		);
		expect(result).toEqual(inner);
		expect(result).not.toBe(inner);
	});

	it("returns null for boxes apart", () => {
		expect(
			calcBoundingBoxIntersection(
				{ left: 0, top: 0, right: 1, bottom: 1 },
				{ left: 2, top: 2, right: 3, bottom: 3 },
			),
		).toBeNull();
	});

	it("returns null for boxes touching along an edge or at a corner", () => {
		const box = { left: 0, top: 0, right: 1, bottom: 1 };
		expect(
			calcBoundingBoxIntersection(box, {
				left: 1,
				top: 0,
				right: 2,
				bottom: 1,
			}),
		).toBeNull();
		expect(
			calcBoundingBoxIntersection(box, {
				left: 1,
				top: 1,
				right: 2,
				bottom: 2,
			}),
		).toBeNull();
	});

	it("returns null when an edge is NaN", () => {
		expect(
			calcBoundingBoxIntersection(
				{ left: NaN, top: 0, right: 10, bottom: 10 },
				{ left: 0, top: 0, right: 10, bottom: 10 },
			),
		).toBeNull();
	});
});
