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
	it("有効な Polygon はエラーなし", () => {
		const o = { ...validPoints, stroke: "#000", strokeWidth: 1, fill: "#eee" };
		expect(validatePolygonDoc(o, "root")).toEqual([]);
	});

	it("points が不正な場合はエラー", () => {
		expect(validatePolygonDoc({}, "root")).toHaveLength(1);
	});

	it("points が 1 点のみはエラー", () => {
		const errors = validatePolygonDoc({ points: [{ x: 0, y: 0 }] }, "root");
		expect(errors).toHaveLength(1);
	});

	// polygon は閉じた多角形なので最低 3 点（スキーマ minItems:3 と一致）。
	// polyline と異なり 2 点は退化線分として弾く。
	it("points が 2 点のみはエラー（at least 3 points）", () => {
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

	it("points が 3 点はエラーなし", () => {
		expect(validatePolygonDoc(validPoints, "root")).toEqual([]);
	});

	it("strokeWidth が数値でない場合はエラー", () => {
		const errors = validatePolygonDoc(
			{ ...validPoints, strokeWidth: "1px" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.strokeWidth")).toBe(true);
	});

	it("fill が string でない場合はエラー", () => {
		const errors = validatePolygonDoc(
			{ ...validPoints, fill: 0xff0000 },
			"root",
		);
		expect(errors.some((e) => e.path === "root.fill")).toBe(true);
	});

	it.each(["stroke", "fill"])(
		"%s に CSS breakout 文字列はエラー（beyondSchema）",
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
