import { describe, it, expect } from "vitest";

import { validateDiamondDoc } from "../validateDiamondDoc";

const validDiamond = {
	x: 0,
	y: 0,
	width: 120,
	height: 80,
	rotation: 0,
	flipX: false,
	flipY: false,
	stroke: "#000",
	strokeWidth: 1,
	fill: "transparent",
	text: "",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: "#000",
	fontSize: 14,
	fontFamily: "sans-serif",
	fontWeight: "normal",
};

describe("validateDiamondDoc", () => {
	it("yields no error for a valid Diamond", () => {
		expect(validateDiamondDoc(validDiamond, "root")).toEqual([]);
	});

	it.each(["x", "y"])("is an error when %s is not a number", (key) => {
		const errors = validateDiamondDoc({ ...validDiamond, [key]: "0" }, "root");
		expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
	});

	it.each(["width", "height"])("is an error when %s is not a number", (key) => {
		const errors = validateDiamondDoc(
			{ ...validDiamond, [key]: "10px" },
			"root",
		);
		expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
	});

	it.each(["width", "height"])(
		"is an error when %s is negative (>= 0)",
		(key) => {
			const errors = validateDiamondDoc({ ...validDiamond, [key]: -1 }, "root");
			expect(
				errors.some(
					(e) => e.path === `root.${key}` && e.message.includes(">= 0"),
				),
			).toBe(true);
		},
	);

	it("allows negative x / y (coordinates have no lower bound)", () => {
		expect(
			validateDiamondDoc({ ...validDiamond, x: -10, y: -20 }, "root"),
		).toEqual([]);
	});

	it("is an error when the removed textType key is present", () => {
		const errors = validateDiamondDoc(
			{ ...validDiamond, textType: "markdown" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.textType")).toBe(true);
	});

	it("yields no error when optional fields are absent", () => {
		const minimal = { x: 0, y: 0, width: 10, height: 10 };
		expect(validateDiamondDoc(minimal, "root")).toEqual([]);
	});

	it.each(["stroke", "fill", "fontColor", "fontFamily", "fontWeight"])(
		"is an error (beyondSchema) when %s contains a CSS breakout string",
		(key) => {
			const errors = validateDiamondDoc(
				{ ...validDiamond, [key]: "a;b" },
				"root",
			);
			const hit = errors.find((e) => e.path === `root.${key}`);
			expect(hit).toBeDefined();
			expect(hit?.beyondSchema).toBe(true);
		},
	);

	it('accepts the color sentinel "auto"', () => {
		expect(
			validateDiamondDoc(
				{ ...validDiamond, stroke: "auto", fill: "auto", fontColor: "auto" },
				"root",
			),
		).toEqual([]);
	});
});
