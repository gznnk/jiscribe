import { describe, expect, it } from "vitest";

import { isValidRectState } from "../validateRectState";

const validRect = {
	id: "r1",
	type: "rect",
	cx: 0,
	cy: 0,
	width: 100,
	height: 50,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	stroke: "#000",
	strokeWidth: 2,
	fill: "#fff",
	text: { body: { text: "label", fontSize: 16 } },
	rx: 4,
};

describe("isValidRectState", () => {
	it("valid Rect is true / minimal config is also true", () => {
		expect(isValidRectState(validRect)).toBe(true);
		expect(
			isValidRectState({
				id: "r1",
				type: "rect",
				cx: 0,
				cy: 0,
				width: 1,
				height: 1,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				// Unstyled, but the slot itself is part of the minimum: the mapper
				// materializes `body` for every rect, drawn or loaded (issue #235).
				text: { body: { text: "" } },
			}),
		).toBe(true);
	});

	it("type mismatch / empty id is false", () => {
		expect(isValidRectState({ ...validRect, type: "ellipse" })).toBe(false);
		expect(isValidRectState({ ...validRect, id: "" })).toBe(false);
	});

	it("missing required geometry is false", () => {
		expect(isValidRectState({ ...validRect, width: undefined })).toBe(false);
		expect(isValidRectState({ ...validRect, scaleY: undefined })).toBe(false);
	});

	it.each(["width", "height", "rx", "strokeWidth"])(
		"%s being negative is false (schema minimum: 0)",
		(key) => {
			expect(isValidRectState({ ...validRect, [key]: -1 })).toBe(false);
		},
	);

	it("cx / cy is true even when negative (no lower bound on position)", () => {
		expect(isValidRectState({ ...validRect, cx: -100, cy: -50 })).toBe(true);
	});

	it("a slot's fontSize < 1 is false (>= 1)", () => {
		expect(
			isValidRectState({
				...validRect,
				text: { body: { text: "label", fontSize: 0 } },
			}),
		).toBe(false);
	});

	it("stroke / fill containing CSS injection is false", () => {
		expect(isValidRectState({ ...validRect, stroke: "red; } body {" })).toBe(
			false,
		);
		expect(isValidRectState({ ...validRect, fill: "url(http://evil)" })).toBe(
			false,
		);
	});
});
