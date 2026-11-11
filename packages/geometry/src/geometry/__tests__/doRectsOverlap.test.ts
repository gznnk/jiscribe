import { describe, expect, it } from "vitest";

import { doRectsOverlap } from "../doRectsOverlap";

describe("doRectsOverlap", () => {
	const square = { x: 0, y: 0, width: 10, height: 10 };

	it("is true for rects sharing some area, either way round", () => {
		const shifted = { x: 5, y: 5, width: 10, height: 10 };

		expect(doRectsOverlap(square, shifted)).toBe(true);
		expect(doRectsOverlap(shifted, square)).toBe(true);
	});

	it("is true for a rect inside the other", () => {
		expect(doRectsOverlap(square, { x: 2, y: 2, width: 3, height: 3 })).toBe(
			true,
		);
	});

	it("is false for rects touching along an edge or at a corner", () => {
		expect(doRectsOverlap(square, { x: 10, y: 0, width: 5, height: 10 })).toBe(
			false,
		);
		expect(doRectsOverlap(square, { x: 10, y: 10, width: 5, height: 5 })).toBe(
			false,
		);
	});

	it("is false for rects apart", () => {
		expect(doRectsOverlap(square, { x: 20, y: 0, width: 5, height: 5 })).toBe(
			false,
		);
	});

	it("is true for a zero-size rect strictly inside, false for one on the edge", () => {
		expect(doRectsOverlap({ x: 5, y: 5, width: 0, height: 0 }, square)).toBe(
			true,
		);
		expect(doRectsOverlap({ x: 0, y: 5, width: 0, height: 0 }, square)).toBe(
			false,
		);
	});
});
