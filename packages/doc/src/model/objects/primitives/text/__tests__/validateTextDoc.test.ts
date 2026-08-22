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

	it("demands a width from the block layout, the box having none to measure", () => {
		const errors = validateTextDoc(
			{ ...validText, textLayout: "block" },
			"root",
		);

		expect(errors).toEqual([
			{ path: "root.width", message: 'is required when textLayout is "block"' },
		]);
	});

	it("accepts a block text carrying its width", () => {
		expect(
			validateTextDoc(
				{ ...validText, textLayout: "block", width: 320 },
				"root",
			),
		).toEqual([]);
	});

	it("is an error when a block width is not a non-negative number", () => {
		expect(
			validateTextDoc(
				{ ...validText, textLayout: "block", width: "320" },
				"root",
			),
		).toEqual([{ path: "root.width", message: "must be a number" }]);
		expect(
			validateTextDoc({ ...validText, textLayout: "block", width: -1 }, "root"),
		).toEqual([{ path: "root.width", message: "must be >= 0" }]);
	});

	it("is an error when the layout mode is not one of the two", () => {
		expect(
			validateTextDoc({ ...validText, textLayout: "flow" }, "root"),
		).toEqual([
			{ path: "root.textLayout", message: "must be one of: label, block" },
		]);
	});

	it("leaves the label layout alone: it stores no width and never demanded one", () => {
		expect(
			validateTextDoc({ ...validText, textLayout: "label" }, "root"),
		).toEqual([]);
		expect(validateTextDoc(validText, "root")).toEqual([]);
	});
});
