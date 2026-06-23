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
	it("有効な Svg はエラーなし", () => {
		expect(validateSvgDoc(validSvg, "root")).toEqual([]);
	});

	it("必須の x が数値でない場合はエラー", () => {
		const errors = validateSvgDoc({ ...validSvg, x: "10" }, "root");
		expect(errors.some((e) => e.path === "root.x")).toBe(true);
	});

	it("svgText が文字列でない場合はエラー", () => {
		const errors = validateSvgDoc({ ...validSvg, svgText: 123 }, "root");
		expect(errors.some((e) => e.path === "root.svgText")).toBe(true);
	});

	it("rotation が数値でない場合はエラー", () => {
		const errors = validateSvgDoc({ ...validSvg, rotation: "0" }, "root");
		expect(errors.some((e) => e.path === "root.rotation")).toBe(true);
	});

	// ─── 強化 ───
	it.each(["y", "width", "height"])(
		"必須の %s が数値でない場合はエラー",
		(key) => {
			const errors = validateSvgDoc({ ...validSvg, [key]: "1" }, "root");
			expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
		},
	);

	it.each(["flipX", "flipY"])("%s が boolean でない場合はエラー", (key) => {
		const errors = validateSvgDoc({ ...validSvg, [key]: 1 }, "root");
		expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
	});

	it("transform 以外のスタイル（stroke/fill）は検証しない（svg は素のボックス）", () => {
		// svg は stroke/fill/text を持たないため、これらが不正でもエラーにならない
		const errors = validateSvgDoc(
			{ ...validSvg, stroke: "a;b", fill: 123 },
			"root",
		);
		expect(errors).toEqual([]);
	});

	it("複数の必須フィールド欠落はすべて報告される", () => {
		const errors = validateSvgDoc({ rotation: 0 }, "root");
		for (const key of ["x", "y", "width", "height", "svgText"]) {
			expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
		}
	});

	// ─── 強化: 数値下限 ───
	it.each(["width", "height"])("%s が負数はエラー（>= 0）", (key) => {
		const errors = validateSvgDoc({ ...validSvg, [key]: -1 }, "root");
		expect(
			errors.some(
				(e) => e.path === `root.${key}` && e.message.includes(">= 0"),
			),
		).toBe(true);
	});

	it("x / y は負数でも許容（位置に下限なし）", () => {
		expect(validateSvgDoc({ ...validSvg, x: -5, y: -5 }, "root")).toEqual([]);
	});
});
