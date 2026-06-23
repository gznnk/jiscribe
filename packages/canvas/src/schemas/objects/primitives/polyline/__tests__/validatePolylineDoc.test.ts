import { describe, it, expect } from "vitest";

import { validatePolylineDoc } from "../validatePolylineDoc";

const validPoints = {
	points: [
		{ x: 0, y: 0 },
		{ x: 10, y: 10 },
	],
};

describe("validatePolylineDoc", () => {
	it("有効な Polyline はエラーなし", () => {
		const o = {
			...validPoints,
			stroke: "#000",
			strokeWidth: 2,
			startArrow: "None",
			endArrow: "FilledTriangle",
		};
		expect(validatePolylineDoc(o, "root")).toEqual([]);
	});

	it("points が不正な場合はエラー", () => {
		expect(validatePolylineDoc({ points: [] }, "root")).toHaveLength(1);
	});

	it("startArrow が不正な値はエラー", () => {
		const errors = validatePolylineDoc(
			{ ...validPoints, startArrow: "arrow" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.startArrow")).toBe(true);
	});

	it("endArrow が不正な値はエラー", () => {
		const errors = validatePolylineDoc(
			{ ...validPoints, endArrow: "diamond" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.endArrow")).toBe(true);
	});

	it("strokeDashType が不正な値はエラー", () => {
		const errors = validatePolylineDoc(
			{ ...validPoints, strokeDashType: "double" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.strokeDashType")).toBe(true);
	});

	it("オプション項目がない場合はエラーなし", () => {
		expect(validatePolylineDoc(validPoints, "root")).toEqual([]);
	});

	// polyline は開いたパスなので最低 2 点（polygon と異なり 2 点は許容）。
	it("points が 1 点のみはエラー（at least 2 points）", () => {
		const errors = validatePolylineDoc({ points: [{ x: 0, y: 0 }] }, "root");
		expect(
			errors.some(
				(e) =>
					e.path === "root.points" && e.message.includes("at least 2 points"),
			),
		).toBe(true);
	});

	it("points が 2 点はエラーなし", () => {
		expect(validatePolylineDoc(validPoints, "root")).toEqual([]);
	});

	it("points 要素が Point でない（数値配列）はエラー", () => {
		const errors = validatePolylineDoc({ points: [1, 2] }, "root");
		expect(errors.some((e) => e.path === "root.points")).toBe(true);
	});

	it("stroke に CSS breakout 文字列はエラー（beyondSchema）", () => {
		const errors = validatePolylineDoc(
			{ ...validPoints, stroke: "a;b" },
			"root",
		);
		const hit = errors.find((e) => e.path === "root.stroke");
		expect(hit).toBeDefined();
		expect(hit?.beyondSchema).toBe(true);
	});
});
