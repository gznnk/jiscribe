import { describe, it, expect } from "vitest";

import { validateRectDoc } from "../validateRectDoc";

const validRect = {
	x: 10,
	y: 20,
	width: 100,
	height: 50,
	rotation: 0,
	flipX: false,
	flipY: false,
	stroke: "#000",
	strokeWidth: 2,
	strokeDashType: "solid",
	fill: "#fff",
	text: "hello",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: "#000",
	fontSize: 16,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
	rx: 4,
};

describe("validateRectDoc", () => {
	it("yields no error for a valid Rect", () => {
		expect(validateRectDoc(validRect, "root")).toEqual([]);
	});

	it("is an error when the required x is not a number", () => {
		const errors = validateRectDoc({ ...validRect, x: "10" }, "root");
		expect(errors.some((e) => e.path === "root.x")).toBe(true);
	});

	it("is an error when the required y is not a number", () => {
		const errors = validateRectDoc({ ...validRect, y: null }, "root");
		expect(errors.some((e) => e.path === "root.y")).toBe(true);
	});

	it("is an error when the required width is not a number", () => {
		const errors = validateRectDoc({ ...validRect, width: "100px" }, "root");
		expect(errors.some((e) => e.path === "root.width")).toBe(true);
	});

	it("is an error when the required height is not a number", () => {
		const errors = validateRectDoc({ ...validRect, height: undefined }, "root");
		expect(errors.some((e) => e.path === "root.height")).toBe(true);
	});

	it("is an error when textAlign has an invalid value", () => {
		const errors = validateRectDoc(
			{ ...validRect, textAlign: "justify" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.textAlign")).toBe(true);
	});

	it("is an error when verticalAlign has an invalid value", () => {
		const errors = validateRectDoc(
			{ ...validRect, verticalAlign: "baseline" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.verticalAlign")).toBe(true);
	});

	it("is an error when strokeDashType has an invalid value", () => {
		const errors = validateRectDoc(
			{ ...validRect, strokeDashType: "double" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.strokeDashType")).toBe(true);
	});

	it("yields no error when optional fields are absent", () => {
		const minimal = { x: 0, y: 0, width: 100, height: 100 };
		expect(validateRectDoc(minimal, "root")).toEqual([]);
	});

	it('yields no error for the color field sentinel "auto" (follows the theme)', () => {
		const autoColored = {
			...validRect,
			stroke: "auto",
			fontColor: "auto",
			fill: "auto",
		};
		expect(validateRectDoc(autoColored, "root")).toEqual([]);
	});

	// ─── Additional coverage: CSS injection safety (beyondSchema) ───
	it.each(["stroke", "fill", "fontColor", "fontFamily", "fontWeight"])(
		"is an error (with the beyondSchema flag) when %s contains a CSS breakout string",
		(key) => {
			const errors = validateRectDoc(
				{ ...validRect, [key]: "red; color: blue" },
				"root",
			);
			const hit = errors.find((e) => e.path === `root.${key}`);
			expect(hit).toBeDefined();
			expect(hit?.beyondSchema).toBe(true);
		},
	);

	it.each(["url(x)", "a{b}", "a/*c*/", "<svg>", "a\\b"])(
		"is an error when fill contains the dangerous fragment %s",
		(bad) => {
			const errors = validateRectDoc({ ...validRect, fill: bad }, "root");
			expect(errors.some((e) => e.path === "root.fill")).toBe(true);
		},
	);

	// ─── Additional coverage: numeric style fields ───
	it.each(["strokeWidth", "fontSize", "rx"])(
		"is an error when %s is not a number",
		(key) => {
			const errors = validateRectDoc({ ...validRect, [key]: "3" }, "root");
			expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
		},
	);

	// ─── Additional coverage: transform fields ───
	it("is an error when rotation is not a number", () => {
		const errors = validateRectDoc({ ...validRect, rotation: "0" }, "root");
		expect(errors.some((e) => e.path === "root.rotation")).toBe(true);
	});

	it.each(["flipX", "flipY"])("is an error when %s is not a boolean", (key) => {
		const errors = validateRectDoc({ ...validRect, [key]: "false" }, "root");
		expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
	});

	it("reports all invalid fields", () => {
		const errors = validateRectDoc(
			{ ...validRect, x: "a", fill: "a;b", fontSize: "z" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.x")).toBe(true);
		expect(errors.some((e) => e.path === "root.fill")).toBe(true);
		expect(errors.some((e) => e.path === "root.fontSize")).toBe(true);
	});

	// ─── Additional coverage: numeric lower bounds (matching schema minimum) ───
	it.each(["width", "height", "rx", "strokeWidth"])(
		"is an error when %s is negative (>= 0)",
		(key) => {
			const errors = validateRectDoc({ ...validRect, [key]: -1 }, "root");
			expect(
				errors.some(
					(e) => e.path === `root.${key}` && e.message.includes(">= 0"),
				),
			).toBe(true);
		},
	);

	it("allows width/height = 0 (minimum: 0)", () => {
		expect(
			validateRectDoc({ ...validRect, width: 0, height: 0 }, "root"),
		).toEqual([]);
	});

	it("is an error when fontSize < 1 (>= 1)", () => {
		const errors = validateRectDoc({ ...validRect, fontSize: 0 }, "root");
		expect(
			errors.some(
				(e) => e.path === "root.fontSize" && e.message.includes(">= 1"),
			),
		).toBe(true);
	});

	it("allows negative x / y (positions have no lower bound)", () => {
		expect(validateRectDoc({ ...validRect, x: -100, y: -50 }, "root")).toEqual(
			[],
		);
	});

	it('still accepts the color sentinel "auto" after the minimum tightening', () => {
		expect(
			validateRectDoc(
				{ ...validRect, stroke: "auto", fill: "auto", fontColor: "auto" },
				"root",
			),
		).toEqual([]);
	});
});
