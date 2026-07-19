import { describe, it, expect } from "vitest";

import { validateContainerDoc } from "../validateContainerDoc";

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
});
