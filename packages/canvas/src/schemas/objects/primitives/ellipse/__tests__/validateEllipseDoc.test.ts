import { describe, it, expect } from "vitest";

import { validateEllipseDoc } from "../validateEllipseDoc";

const validEllipse = {
	cx: 50,
	cy: 50,
	rx: 30,
	ry: 20,
	rotation: 0,
	flipX: false,
	flipY: false,
	stroke: "#000",
	strokeWidth: 1,
	fill: "transparent",
	text: "",
	textType: "text",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: "#000",
	fontSize: 14,
	fontFamily: "sans-serif",
	fontWeight: "normal",
};

describe("validateEllipseDoc", () => {
	it("yields no error for a valid Ellipse", () => {
		expect(validateEllipseDoc(validEllipse, "root")).toEqual([]);
	});

	it("is an error when cx is not a number", () => {
		const errors = validateEllipseDoc({ ...validEllipse, cx: "50" }, "root");
		expect(errors.some((e) => e.path === "root.cx")).toBe(true);
	});

	it("is an error when cy is not a number", () => {
		const errors = validateEllipseDoc({ ...validEllipse, cy: null }, "root");
		expect(errors.some((e) => e.path === "root.cy")).toBe(true);
	});

	it("is an error when rx is not a number", () => {
		const errors = validateEllipseDoc({ ...validEllipse, rx: "30px" }, "root");
		expect(errors.some((e) => e.path === "root.rx")).toBe(true);
	});

	it("is an error when ry is not a number", () => {
		const errors = validateEllipseDoc(
			{ ...validEllipse, ry: undefined },
			"root",
		);
		expect(errors.some((e) => e.path === "root.ry")).toBe(true);
	});

	it("is an error when textType has an invalid value", () => {
		const errors = validateEllipseDoc(
			{ ...validEllipse, textType: "html" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.textType")).toBe(true);
	});

	it("yields no error when optional fields are absent", () => {
		const minimal = { cx: 0, cy: 0, rx: 10, ry: 10 };
		expect(validateEllipseDoc(minimal, "root")).toEqual([]);
	});

	// ─── Additional coverage ───
	it.each(["textAlign", "verticalAlign"])(
		"is an error when %s has an invalid value",
		(key) => {
			const errors = validateEllipseDoc(
				{ ...validEllipse, [key]: "bogus" },
				"root",
			);
			expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
		},
	);

	it.each(["strokeWidth", "fontSize"])(
		"is an error when %s is not a number",
		(key) => {
			const errors = validateEllipseDoc(
				{ ...validEllipse, [key]: "1" },
				"root",
			);
			expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
		},
	);

	it("is an error when rotation is not a number", () => {
		const errors = validateEllipseDoc(
			{ ...validEllipse, rotation: "0" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.rotation")).toBe(true);
	});

	it.each(["flipX", "flipY"])("is an error when %s is not a boolean", (key) => {
		const errors = validateEllipseDoc({ ...validEllipse, [key]: 1 }, "root");
		expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
	});

	it.each(["stroke", "fill", "fontColor", "fontFamily", "fontWeight"])(
		"is an error (beyondSchema) when %s contains a CSS breakout string",
		(key) => {
			const errors = validateEllipseDoc(
				{ ...validEllipse, [key]: "a;b" },
				"root",
			);
			const hit = errors.find((e) => e.path === `root.${key}`);
			expect(hit).toBeDefined();
			expect(hit?.beyondSchema).toBe(true);
		},
	);

	// ─── Additional coverage: numeric lower bounds ───
	it.each(["rx", "ry"])(
		"is an error when radius %s is negative (>= 0)",
		(key) => {
			const errors = validateEllipseDoc({ ...validEllipse, [key]: -1 }, "root");
			expect(
				errors.some(
					(e) => e.path === `root.${key}` && e.message.includes(">= 0"),
				),
			).toBe(true);
		},
	);

	it("allows negative cx / cy (center coordinates have no lower bound)", () => {
		expect(
			validateEllipseDoc({ ...validEllipse, cx: -10, cy: -20 }, "root"),
		).toEqual([]);
	});

	it('accepts the color sentinel "auto"', () => {
		expect(
			validateEllipseDoc(
				{ ...validEllipse, stroke: "auto", fill: "auto", fontColor: "auto" },
				"root",
			),
		).toEqual([]);
	});
});
