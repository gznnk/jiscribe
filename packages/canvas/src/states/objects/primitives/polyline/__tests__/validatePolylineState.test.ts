import { describe, expect, it } from "vitest";

import { isValidPolylineState } from "../validatePolylineState";

const pts = (n: number) =>
	Array.from({ length: n }, (_v, i) => ({ x: i, y: i }));

const validPolyline = {
	id: "p1",
	type: "polyline",
	points: pts(2),
	stroke: "#000",
	strokeWidth: 1,
	startArrow: "None",
};

describe("isValidPolylineState", () => {
	it("valid Polyline (2 or more points) is true", () => {
		expect(isValidPolylineState(validPolyline)).toBe(true);
		expect(isValidPolylineState({ ...validPolyline, points: pts(5) })).toBe(
			true,
		);
	});

	it("points with only 1 point / missing is false (minimum 2 points)", () => {
		expect(isValidPolylineState({ ...validPolyline, points: pts(1) })).toBe(
			false,
		);
		expect(isValidPolylineState({ ...validPolyline, points: undefined })).toBe(
			false,
		);
	});

	it("invalid ArrowType is false", () => {
		expect(
			isValidPolylineState({ ...validPolyline, endArrow: "diamond" }),
		).toBe(false);
	});

	it("stroke containing CSS injection is false", () => {
		expect(
			isValidPolylineState({ ...validPolyline, stroke: "red; } body {" }),
		).toBe(false);
	});
});
