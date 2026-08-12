import { describe, it, expect } from "vitest";

import { containerDocDefinition } from "../../doc";

const validateContainerDoc = containerDocDefinition.validateDoc;

const validContainer = {
	x: 10,
	y: 20,
	width: 240,
	height: 160,
	stroke: "auto",
	fill: "transparent",
	headerFill: "auto",
	text: "Auth module",
};

describe("validateContainerDoc", () => {
	it("yields no error for a valid Container", () => {
		expect(validateContainerDoc(validContainer, "root")).toEqual([]);
	});

	it('accepts headerFill = "auto" (the default)', () => {
		expect(
			validateContainerDoc({ ...validContainer, headerFill: "auto" }, "root"),
		).toEqual([]);
	});

	it("accepts a concrete headerFill color", () => {
		expect(
			validateContainerDoc(
				{ ...validContainer, headerFill: "#3b82f6" },
				"root",
			),
		).toEqual([]);
	});

	it("omitting headerFill is valid (optional field)", () => {
		const { headerFill: _omitted, ...withoutHeaderFill } = validContainer;
		expect(validateContainerDoc(withoutHeaderFill, "root")).toEqual([]);
	});

	it("is an error when headerFill is not a string", () => {
		const errors = validateContainerDoc(
			{ ...validContainer, headerFill: 123 },
			"root",
		);
		expect(errors.some((e) => e.path === "root.headerFill")).toBe(true);
	});

	it("is an error when headerFill is an unsafe CSS value", () => {
		const errors = validateContainerDoc(
			{ ...validContainer, headerFill: "url(evil)" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.headerFill")).toBe(true);
	});

	it("accepts a headerHeight, which overrides the default band height", () => {
		expect(
			validateContainerDoc({ ...validContainer, headerHeight: 48 }, "root"),
		).toEqual([]);
	});

	it("omitting headerHeight is valid (optional field)", () => {
		expect(
			validateContainerDoc(
				{ ...validContainer, headerHeight: undefined },
				"root",
			),
		).toEqual([]);
	});

	it("is an error when headerHeight is not a number", () => {
		const errors = validateContainerDoc(
			{ ...validContainer, headerHeight: "48" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.headerHeight")).toBe(true);
	});

	it("is an error when headerHeight is below the lower bound of 1", () => {
		// A band of 0 or less has no height to draw the title in.
		for (const headerHeight of [0, -10]) {
			const errors = validateContainerDoc(
				{ ...validContainer, headerHeight },
				"root",
			);
			expect(
				errors.some((e) => e.path === "root.headerHeight"),
				`headerHeight = ${headerHeight}`,
			).toBe(true);
		}
	});

	it("accepts the lower bound itself", () => {
		expect(
			validateContainerDoc({ ...validContainer, headerHeight: 1 }, "root"),
		).toEqual([]);
	});

	it("reports headerFill and headerHeight independently", () => {
		const errors = validateContainerDoc(
			{ ...validContainer, headerFill: 123, headerHeight: 0 },
			"root",
		);
		expect(errors.map((e) => e.path)).toEqual(
			expect.arrayContaining(["root.headerFill", "root.headerHeight"]),
		);
	});
});
