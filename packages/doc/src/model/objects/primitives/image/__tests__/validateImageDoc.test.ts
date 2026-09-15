import { describe, it, expect } from "vitest";

import { validateImageDoc } from "../validateImageDoc";

const validImage = {
	x: 10,
	y: 20,
	width: 200,
	height: 120,
	rotation: 0,
	flipX: false,
	flipY: false,
	src: "images/logo.png",
};

describe("validateImageDoc", () => {
	it("yields no error for a valid Image", () => {
		expect(validateImageDoc(validImage, "root")).toEqual([]);
	});

	it("is an error when src is not a string", () => {
		const errors = validateImageDoc({ ...validImage, src: 123 }, "root");
		expect(errors.some((e) => e.path === "root.src")).toBe(true);
	});

	it("is an error when src is the empty string", () => {
		const errors = validateImageDoc({ ...validImage, src: "" }, "root");
		expect(
			errors.some(
				(e) => e.path === "root.src" && e.message === "must name a file",
			),
		).toBe(true);
	});

	it.each(["x", "y", "width", "height"])(
		"is an error when the required %s is not a number",
		(key) => {
			const errors = validateImageDoc({ ...validImage, [key]: "1" }, "root");
			expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
		},
	);

	it("is an error when rotation is not a number", () => {
		const errors = validateImageDoc({ ...validImage, rotation: "0" }, "root");
		expect(errors.some((e) => e.path === "root.rotation")).toBe(true);
	});

	it.each(["flipX", "flipY"])("is an error when %s is not a boolean", (key) => {
		const errors = validateImageDoc({ ...validImage, [key]: 1 }, "root");
		expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
	});

	it("reports all missing required fields", () => {
		const errors = validateImageDoc({ rotation: 0 }, "root");
		for (const key of ["x", "y", "width", "height", "src"]) {
			expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
		}
	});

	it("does not validate styles other than transform (stroke/fill) (image is a plain box)", () => {
		// image has no stroke/fill/text, so invalid values here produce no errors
		const errors = validateImageDoc(
			{ ...validImage, stroke: "a;b", fill: 123 },
			"root",
		);
		expect(errors).toEqual([]);
	});

	it.each(["width", "height"])(
		"is an error when %s is negative (>= 0)",
		(key) => {
			const errors = validateImageDoc({ ...validImage, [key]: -1 }, "root");
			expect(
				errors.some(
					(e) => e.path === `root.${key}` && e.message.includes(">= 0"),
				),
			).toBe(true);
		},
	);

	it("accepts a src the path rule would reject (resolution is the host's)", () => {
		expect(
			validateImageDoc({ ...validImage, src: "../outside.png" }, "root"),
		).toEqual([]);
	});
});
