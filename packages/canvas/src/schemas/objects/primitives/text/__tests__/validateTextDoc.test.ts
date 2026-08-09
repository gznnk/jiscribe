import { describe, expect, it } from "vitest";

import { validateTextDoc } from "../validateTextDoc";

const validText = {
	x: 10,
	y: 20,
	rotation: 0,
	flipX: false,
	flipY: false,
	text: "hello",
	textAlign: "left",
	verticalAlign: "top",
	fontColor: "auto",
	fontSize: 16,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
};

describe("validateTextDoc", () => {
	it("yields no error for a valid Text", () => {
		expect(validateTextDoc(validText, "root")).toEqual([]);
	});

	it("is an error when the required x is not a number", () => {
		const errors = validateTextDoc({ ...validText, x: "10" }, "root");
		expect(errors.some((e) => e.path === "root.x")).toBe(true);
	});

	it("is an error when the required y is missing", () => {
		const errors = validateTextDoc({ ...validText, y: undefined }, "root");
		expect(errors.some((e) => e.path === "root.y")).toBe(true);
	});

	it("demands nothing but a position: the box is measured, not stored", () => {
		expect(validateTextDoc({ x: 0, y: 0 }, "root")).toEqual([]);
	});

	it("is an error when the text styling has the wrong type", () => {
		expect(
			validateTextDoc({ ...validText, fontSize: "16px" }, "root").some(
				(e) => e.path === "root.fontSize",
			),
		).toBe(true);
		expect(
			validateTextDoc({ ...validText, textAlign: "middle" }, "root").some(
				(e) => e.path === "root.textAlign",
			),
		).toBe(true);
	});

	it("is an error when the transform fields have the wrong type", () => {
		expect(
			validateTextDoc({ ...validText, rotation: "45deg" }, "root").some(
				(e) => e.path === "root.rotation",
			),
		).toBe(true);
	});
});
