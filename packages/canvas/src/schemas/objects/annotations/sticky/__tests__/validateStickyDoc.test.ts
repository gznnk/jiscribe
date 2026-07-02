import { describe, it, expect } from "vitest";

import { validateStickyDoc } from "../validateStickyDoc";

const validSticky = {
	x: 0,
	y: 0,
	width: 160,
	height: 120,
	rotation: 0,
	flipX: false,
	flipY: false,
	fill: "#fef9c3",
	text: "memo",
	textType: "text",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: "#000",
	fontSize: 14,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
};

describe("validateStickyDoc", () => {
	it("yields no error for a valid Sticky", () => {
		expect(validateStickyDoc(validSticky, "root")).toEqual([]);
	});

	it("is an error when the required x is not a number", () => {
		const errors = validateStickyDoc({ ...validSticky, x: "0" }, "root");
		expect(errors.some((e) => e.path === "root.x")).toBe(true);
	});

	it("is an error when the required y is not a number", () => {
		const errors = validateStickyDoc({ ...validSticky, y: null }, "root");
		expect(errors.some((e) => e.path === "root.y")).toBe(true);
	});

	it("is an error when the required width is not a number", () => {
		const errors = validateStickyDoc(
			{ ...validSticky, width: undefined },
			"root",
		);
		expect(errors.some((e) => e.path === "root.width")).toBe(true);
	});

	it("is an error when the required height is not a number", () => {
		const errors = validateStickyDoc(
			{ ...validSticky, height: "120px" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.height")).toBe(true);
	});

	it("is an error when textAlign has an invalid value", () => {
		const errors = validateStickyDoc(
			{ ...validSticky, textAlign: "justify" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.textAlign")).toBe(true);
	});

	it("is an error when verticalAlign has an invalid value", () => {
		const errors = validateStickyDoc(
			{ ...validSticky, verticalAlign: "baseline" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.verticalAlign")).toBe(true);
	});

	it("is an error when fill is not a string", () => {
		const errors = validateStickyDoc(
			{ ...validSticky, fill: 0xfef9c3 },
			"root",
		);
		expect(errors.some((e) => e.path === "root.fill")).toBe(true);
	});

	it("yields no error when optional fields are absent", () => {
		const minimal = { x: 0, y: 0, width: 160, height: 120 };
		expect(validateStickyDoc(minimal, "root")).toEqual([]);
	});

	// ─── Additional coverage ───
	it("is an error when fontSize is not a number", () => {
		const errors = validateStickyDoc(
			{ ...validSticky, fontSize: "14" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.fontSize")).toBe(true);
	});

	it("is an error when rotation is not a number", () => {
		const errors = validateStickyDoc({ ...validSticky, rotation: "0" }, "root");
		expect(errors.some((e) => e.path === "root.rotation")).toBe(true);
	});

	it.each(["flipX", "flipY"])("is an error when %s is not a boolean", (key) => {
		const errors = validateStickyDoc({ ...validSticky, [key]: 1 }, "root");
		expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
	});

	it.each(["fill", "fontColor", "fontFamily", "fontWeight"])(
		"is an error (beyondSchema) when %s contains a CSS breakout string",
		(key) => {
			const errors = validateStickyDoc(
				{ ...validSticky, [key]: "a;b" },
				"root",
			);
			const hit = errors.find((e) => e.path === `root.${key}`);
			expect(hit).toBeDefined();
			expect(hit?.beyondSchema).toBe(true);
		},
	);

	it("does not validate stroke since sticky has no stroke", () => {
		// sticky has no border style, so even an invalid stroke passes through
		expect(
			validateStickyDoc({ ...validSticky, stroke: "a;b" }, "root"),
		).toEqual([]);
	});

	// ─── Additional coverage: numeric lower bounds ───
	it.each(["width", "height"])(
		"is an error when %s is negative (>= 0)",
		(key) => {
			const errors = validateStickyDoc({ ...validSticky, [key]: -1 }, "root");
			expect(
				errors.some(
					(e) => e.path === `root.${key}` && e.message.includes(">= 0"),
				),
			).toBe(true);
		},
	);

	it("is an error when fontSize < 1 (>= 1)", () => {
		const errors = validateStickyDoc({ ...validSticky, fontSize: 0 }, "root");
		expect(
			errors.some(
				(e) => e.path === "root.fontSize" && e.message.includes(">= 1"),
			),
		).toBe(true);
	});

	it('accepts the color sentinel "auto"', () => {
		expect(
			validateStickyDoc(
				{ ...validSticky, fill: "auto", fontColor: "auto" },
				"root",
			),
		).toEqual([]);
	});
});
