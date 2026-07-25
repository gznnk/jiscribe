import { describe, it, expect } from "vitest";

import { isTransformedEllipse } from "../isTransformedEllipse";

describe("isTransformedEllipse", () => {
	it("returns true for a valid TransformedEllipse", () => {
		expect(
			isTransformedEllipse({
				cx: 0,
				cy: 0,
				rx: 50,
				ry: 30,
				rotation: 30,
				scaleX: 1,
				scaleY: 1,
			}),
		).toBe(true);
	});

	it("returns false when the Transform properties are missing", () => {
		expect(isTransformedEllipse({ cx: 0, cy: 0, rx: 50, ry: 30 })).toBe(false);
	});

	it("returns false when the Ellipse properties are missing", () => {
		expect(isTransformedEllipse({ rotation: 0, scaleX: 1, scaleY: 1 })).toBe(
			false,
		);
	});

	it("returns false for a negative rx", () => {
		expect(
			isTransformedEllipse({
				cx: 0,
				cy: 0,
				rx: -1,
				ry: 30,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			}),
		).toBe(false);
	});
});
