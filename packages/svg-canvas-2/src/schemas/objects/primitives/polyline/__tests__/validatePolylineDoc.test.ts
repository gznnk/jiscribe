import { describe, it, expect } from "vitest";

import { validatePolylineDoc } from "../validatePolylineDoc";

const validPoints = { points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] };

describe("validatePolylineDoc", () => {
	it("有効な Polyline はエラーなし", () => {
		const o = { ...validPoints, stroke: "#000", strokeWidth: 2, startArrow: "None", endArrow: "FilledTriangle" };
		expect(validatePolylineDoc(o, "root")).toEqual([]);
	});

	it("points が不正な場合はエラー", () => {
		expect(validatePolylineDoc({ points: [] }, "root")).toHaveLength(1);
	});

	it("startArrow が不正な値はエラー", () => {
		const errors = validatePolylineDoc({ ...validPoints, startArrow: "arrow" }, "root");
		expect(errors.some(e => e.path === "root.startArrow")).toBe(true);
	});

	it("endArrow が不正な値はエラー", () => {
		const errors = validatePolylineDoc({ ...validPoints, endArrow: "diamond" }, "root");
		expect(errors.some(e => e.path === "root.endArrow")).toBe(true);
	});

	it("strokeDashType が不正な値はエラー", () => {
		const errors = validatePolylineDoc({ ...validPoints, strokeDashType: "double" }, "root");
		expect(errors.some(e => e.path === "root.strokeDashType")).toBe(true);
	});

	it("オプション項目がない場合はエラーなし", () => {
		expect(validatePolylineDoc(validPoints, "root")).toEqual([]);
	});
});
