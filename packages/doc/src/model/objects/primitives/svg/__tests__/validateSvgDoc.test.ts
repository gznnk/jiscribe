import { describe, it, expect } from "vitest";

import { validateSvgDoc } from "../validateSvgDoc";

const validSvg = {
	x: 10,
	y: 20,
	width: 100,
	height: 50,
	rotation: 0,
	flipX: false,
	flipY: false,
	svgText: "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
};

describe("validateSvgDoc", () => {
	it("yields no error for a valid Svg", () => {
		expect(validateSvgDoc(validSvg, "root")).toEqual([]);
	});

	it("is an error when the required x is not a number", () => {
		const errors = validateSvgDoc({ ...validSvg, x: "10" }, "root");
		expect(errors.some((e) => e.path === "root.x")).toBe(true);
	});

	it("is an error when svgText is not a string", () => {
		const errors = validateSvgDoc({ ...validSvg, svgText: 123 }, "root");
		expect(errors.some((e) => e.path === "root.svgText")).toBe(true);
	});

	it("is an error when rotation is not a number", () => {
		const errors = validateSvgDoc({ ...validSvg, rotation: "0" }, "root");
		expect(errors.some((e) => e.path === "root.rotation")).toBe(true);
	});

	// ─── Additional coverage ───
	it.each(["y", "width", "height"])(
		"is an error when the required %s is not a number",
		(key) => {
			const errors = validateSvgDoc({ ...validSvg, [key]: "1" }, "root");
			expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
		},
	);

	it.each(["flipX", "flipY"])("is an error when %s is not a boolean", (key) => {
		const errors = validateSvgDoc({ ...validSvg, [key]: 1 }, "root");
		expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
	});

	it("does not validate styles other than transform (stroke/fill) (svg is a plain box)", () => {
		// svg has no stroke/fill/text, so invalid values here do not produce errors
		const errors = validateSvgDoc(
			{ ...validSvg, stroke: "a;b", fill: 123 },
			"root",
		);
		expect(errors).toEqual([]);
	});

	it("reports all missing required fields", () => {
		const errors = validateSvgDoc({ rotation: 0 }, "root");
		for (const key of ["x", "y", "width", "height", "svgText"]) {
			expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
		}
	});

	// ─── Additional coverage: numeric lower bounds ───
	it.each(["width", "height"])(
		"is an error when %s is negative (>= 0)",
		(key) => {
			const errors = validateSvgDoc({ ...validSvg, [key]: -1 }, "root");
			expect(
				errors.some(
					(e) => e.path === `root.${key}` && e.message.includes(">= 0"),
				),
			).toBe(true);
		},
	);

	it("allows negative x / y (positions have no lower bound)", () => {
		expect(validateSvgDoc({ ...validSvg, x: -5, y: -5 }, "root")).toEqual([]);
	});
});
