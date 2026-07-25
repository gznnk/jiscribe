import { describe, it, expect } from "vitest";

import { isTransform } from "../isTransform";

describe("isTransform", () => {
	it("returns true for a valid Transform", () => {
		expect(isTransform({ rotation: 0, scaleX: 1, scaleY: 1 })).toBe(true);
		expect(isTransform({ rotation: 45, scaleX: -1, scaleY: 1 })).toBe(true);
	});

	it("returns false when scaleX or scaleY is neither 1 nor -1", () => {
		expect(isTransform({ rotation: 0, scaleX: 2, scaleY: 1 })).toBe(false);
		expect(isTransform({ rotation: 0, scaleX: 1, scaleY: 0.5 })).toBe(false);
		expect(isTransform({ rotation: 0, scaleX: 0, scaleY: 1 })).toBe(false);
	});

	it("returns false when rotation is missing", () => {
		expect(isTransform({ scaleX: 1, scaleY: 1 })).toBe(false);
	});

	it("returns false when scaleX is missing", () => {
		expect(isTransform({ rotation: 0, scaleY: 1 })).toBe(false);
	});

	it("returns false when scaleY is missing", () => {
		expect(isTransform({ rotation: 0, scaleX: 1 })).toBe(false);
	});

	it("returns false when rotation is not a number", () => {
		expect(isTransform({ rotation: "45", scaleX: 1, scaleY: 1 })).toBe(false);
	});

	it("returns false for null", () => {
		expect(isTransform(null)).toBe(false);
	});
});
