import { describe, expect, it } from "vitest";

import { isValidStickyState } from "../validateStickyState";

const validSticky = {
	id: "s1",
	type: "sticky",
	cx: 0,
	cy: 0,
	width: 100,
	height: 100,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	fill: "#ffeb3b",
	fontSize: 14,
};

describe("isValidStickyState", () => {
	it("returns true for a valid Sticky", () => {
		expect(isValidStickyState(validSticky)).toBe(true);
	});

	it("returns false on type mismatch / missing required geometry", () => {
		expect(isValidStickyState({ ...validSticky, type: "rect" })).toBe(false);
		expect(isValidStickyState({ ...validSticky, cx: undefined })).toBe(false);
	});

	it("returns false when width / height is negative (minimum: 0)", () => {
		expect(isValidStickyState({ ...validSticky, width: -1 })).toBe(false);
	});

	it("returns false when fontSize < 1 (>= 1)", () => {
		expect(isValidStickyState({ ...validSticky, fontSize: 0 })).toBe(false);
	});

	it("returns false for a fontFamily containing CSS injection", () => {
		expect(
			isValidStickyState({ ...validSticky, fontFamily: "Arial; } body {" }),
		).toBe(false);
	});
});
