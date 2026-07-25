import { describe, it, expect } from "vitest";

import { isTransformedRect } from "../isTransformedRect";

describe("isTransformedRect", () => {
	it("returns true for a valid TransformedRect", () => {
		expect(
			isTransformedRect({
				x: 0,
				y: 0,
				width: 100,
				height: 60,
				rotation: 45,
				scaleX: 1,
				scaleY: 1,
			}),
		).toBe(true);
	});

	it("returns false when the Transform properties are missing", () => {
		expect(isTransformedRect({ x: 0, y: 0, width: 100, height: 60 })).toBe(
			false,
		);
	});

	it("returns false when the Rect properties are missing", () => {
		expect(isTransformedRect({ rotation: 0, scaleX: 1, scaleY: 1 })).toBe(
			false,
		);
	});

	it("returns false for a negative width", () => {
		expect(
			isTransformedRect({
				x: 0,
				y: 0,
				width: -10,
				height: 60,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			}),
		).toBe(false);
	});
});
