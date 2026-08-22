import { describe, it, expect } from "vitest";

import { validatePolylineDoc } from "../validatePolylineDoc";

const validPoints = {
	points: [
		{ x: 0, y: 0 },
		{ x: 10, y: 10 },
	],
};

describe("validatePolylineDoc", () => {
	it("yields no error for a valid Polyline", () => {
		const o = {
			...validPoints,
			stroke: "#000",
			strokeWidth: 2,
			startArrow: "None",
			endArrow: "FilledTriangle",
		};
		expect(validatePolylineDoc(o, "root")).toEqual([]);
	});

	it("is an error when points is invalid", () => {
		expect(validatePolylineDoc({ points: [] }, "root")).toHaveLength(1);
	});

	it("is an error when startArrow has an invalid value", () => {
		const errors = validatePolylineDoc(
			{ ...validPoints, startArrow: "arrow" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.startArrow")).toBe(true);
	});

	it("is an error when endArrow has an invalid value", () => {
		const errors = validatePolylineDoc(
			{ ...validPoints, endArrow: "diamond" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.endArrow")).toBe(true);
	});

	it("is an error when strokeDashType has an invalid value", () => {
		const errors = validatePolylineDoc(
			{ ...validPoints, strokeDashType: "double" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.strokeDashType")).toBe(true);
	});

	it("yields no error when optional fields are absent", () => {
		expect(validatePolylineDoc(validPoints, "root")).toEqual([]);
	});

	// A polyline is an open path, so it requires at least 2 points (unlike polygon, 2 points are allowed).
	it("is an error when points has only 1 point (at least 2 points)", () => {
		const errors = validatePolylineDoc({ points: [{ x: 0, y: 0 }] }, "root");
		expect(
			errors.some(
				(e) =>
					e.path === "root.points" && e.message.includes("at least 2 points"),
			),
		).toBe(true);
	});

	it("yields no error when points has 2 points", () => {
		expect(validatePolylineDoc(validPoints, "root")).toEqual([]);
	});

	it("is an error when a points element is not a Point (numeric array)", () => {
		const errors = validatePolylineDoc({ points: [1, 2] }, "root");
		expect(errors.some((e) => e.path === "root.points")).toBe(true);
	});

	it("is an error (beyondSchema) when stroke contains a CSS breakout string", () => {
		const errors = validatePolylineDoc(
			{ ...validPoints, stroke: "a;b" },
			"root",
		);
		const hit = errors.find((e) => e.path === "root.stroke");
		expect(hit).toBeDefined();
		expect(hit?.beyondSchema).toBe(true);
	});
});
