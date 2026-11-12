import { describe, expect, it } from "vitest";

import { isPointInBoundingBox } from "../../geometry/isPointInBoundingBox";

const BOX = { left: 0, top: 0, right: 10, bottom: 5 };

describe("isPointInBoundingBox", () => {
	it("is true inside the box", () => {
		expect(isPointInBoundingBox({ x: 3, y: 2 }, BOX)).toBe(true);
	});

	it("is true on an edge and at a corner", () => {
		expect(isPointInBoundingBox({ x: 10, y: 2 }, BOX)).toBe(true);
		expect(isPointInBoundingBox({ x: 0, y: 0 }, BOX)).toBe(true);
	});

	it("is false outside the box", () => {
		expect(isPointInBoundingBox({ x: 11, y: 2 }, BOX)).toBe(false);
		expect(isPointInBoundingBox({ x: 3, y: -1 }, BOX)).toBe(false);
	});

	it("is false for an inverted box and for a NaN coordinate", () => {
		expect(
			isPointInBoundingBox(
				{ x: 5, y: 2 },
				{ left: 10, top: 0, right: 0, bottom: 5 },
			),
		).toBe(false);
		expect(isPointInBoundingBox({ x: NaN, y: 2 }, BOX)).toBe(false);
	});
});
