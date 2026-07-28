import { describe, expect, it } from "vitest";

import { isValidEllipseState } from "../validateEllipseState";

const validEllipse = {
	id: "e1",
	type: "ellipse",
	cx: 0,
	cy: 0,
	width: 100,
	height: 50,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	stroke: "#000",
	fill: "#fff",
	text: { body: { text: "label", fontSize: 16 } },
};

describe("isValidEllipseState", () => {
	it("valid Ellipse is true", () => {
		expect(isValidEllipseState(validEllipse)).toBe(true);
	});

	it("type mismatch / missing required geometry is false", () => {
		expect(isValidEllipseState({ ...validEllipse, type: "rect" })).toBe(false);
		expect(isValidEllipseState({ ...validEllipse, height: undefined })).toBe(
			false,
		);
	});

	it("negative width / height is false (minimum: 0)", () => {
		expect(isValidEllipseState({ ...validEllipse, width: -1 })).toBe(false);
		expect(isValidEllipseState({ ...validEllipse, height: -1 })).toBe(false);
	});

	it("a slot's fontSize < 1 is false (>= 1)", () => {
		expect(
			isValidEllipseState({
				...validEllipse,
				text: { body: { text: "label", fontSize: 0 } },
			}),
		).toBe(false);
	});

	it("fill containing CSS injection is false", () => {
		expect(isValidEllipseState({ ...validEllipse, fill: "a; } body {" })).toBe(
			false,
		);
	});
});
