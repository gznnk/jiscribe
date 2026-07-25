import { describe, it, expect } from "vitest";

import { isTransformedFrame } from "../isTransformedFrame";

describe("isTransformedFrame", () => {
	it("returns true for a valid TransformedFrame", () => {
		expect(
			isTransformedFrame({
				cx: 50,
				cy: 30,
				width: 100,
				height: 60,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			}),
		).toBe(true);
	});

	it("returns false when the Transform properties are missing", () => {
		expect(isTransformedFrame({ cx: 50, cy: 30, width: 100, height: 60 })).toBe(
			false,
		);
	});

	it("returns false when the Frame properties are missing", () => {
		expect(isTransformedFrame({ rotation: 0, scaleX: 1, scaleY: 1 })).toBe(
			false,
		);
	});

	it("returns false for a negative width", () => {
		expect(
			isTransformedFrame({
				cx: 50,
				cy: 30,
				width: -10,
				height: 60,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			}),
		).toBe(false);
	});
});
