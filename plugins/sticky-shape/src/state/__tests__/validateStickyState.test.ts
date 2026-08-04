import { describe, expect, it } from "vitest";

import { stickyDefinition } from "../../definition";

const isValidStickyState = stickyDefinition.stateValidator;

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
	text: { body: { text: "note", fontSize: 14 } },
};

/** The same sticky with one styling field of its body slot replaced. */
const withBodyStyle = (style: Record<string, unknown>) => ({
	...validSticky,
	text: { body: { ...validSticky.text.body, ...style } },
});

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

	it("returns false when a slot's fontSize < 1 (>= 1)", () => {
		expect(isValidStickyState(withBodyStyle({ fontSize: 0 }))).toBe(false);
	});

	it("returns false for a slot's fontFamily containing CSS injection", () => {
		expect(
			isValidStickyState(withBodyStyle({ fontFamily: "Arial; } body {" })),
		).toBe(false);
	});
});
