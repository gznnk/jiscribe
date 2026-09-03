import { describe, it, expect } from "vitest";

import { validatePolygonDoc } from "../validatePolygonDoc";

const validPoints = {
	points: [
		{ x: 0, y: 0 },
		{ x: 10, y: 0 },
		{ x: 5, y: 10 },
	],
};

describe("validatePolygonDoc", () => {
	it("yields no error for a valid Polygon", () => {
		const o = { ...validPoints, stroke: "#000", strokeWidth: 1, fill: "#eee" };
		expect(validatePolygonDoc(o, "root")).toEqual([]);
	});

	it("is an error when points is invalid", () => {
		expect(validatePolygonDoc({}, "root")).toHaveLength(1);
	});

	it("is an error when points has only 1 point", () => {
		const errors = validatePolygonDoc({ points: [{ x: 0, y: 0 }] }, "root");
		expect(errors).toHaveLength(1);
	});

	// A polygon is a closed shape, so it requires at least 3 points (matching schema minItems:3).
	// Unlike polyline, 2 points are rejected as a degenerate segment.
	it("is an error when points has only 2 points (at least 3 points)", () => {
		const errors = validatePolygonDoc(
			{
				points: [
					{ x: 0, y: 0 },
					{ x: 10, y: 0 },
				],
			},
			"root",
		);
		expect(
			errors.some(
				(e) =>
					e.path === "root.points" && e.message.includes("at least 3 points"),
			),
		).toBe(true);
	});

	it("yields no error when points has 3 points", () => {
		expect(validatePolygonDoc(validPoints, "root")).toEqual([]);
	});

	it("is an error when strokeWidth is not a number", () => {
		const errors = validatePolygonDoc(
			{ ...validPoints, strokeWidth: "1px" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.strokeWidth")).toBe(true);
	});

	it("is an error when fill is not a string", () => {
		const errors = validatePolygonDoc(
			{ ...validPoints, fill: 0xff0000 },
			"root",
		);
		expect(errors.some((e) => e.path === "root.fill")).toBe(true);
	});

	it.each(["stroke", "fill"])(
		"is an error (beyondSchema) when %s contains a CSS breakout string",
		(key) => {
			const errors = validatePolygonDoc(
				{ ...validPoints, [key]: "a;b" },
				"root",
			);
			const hit = errors.find((e) => e.path === `root.${key}`);
			expect(hit).toBeDefined();
			expect(hit?.beyondSchema).toBe(true);
		},
	);
});
