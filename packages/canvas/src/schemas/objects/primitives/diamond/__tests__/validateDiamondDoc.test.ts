import { describe, it, expect } from "vitest";

import { validateDiamondDoc } from "../validateDiamondDoc";

const validDiamond = {
	x: 0,
	y: 0,
	width: 120,
	height: 80,
	rotation: 0,
	flipX: false,
	flipY: false,
	stroke: "#000",
	strokeWidth: 1,
	fill: "transparent",
	text: "",
	textType: "text",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: "#000",
	fontSize: 14,
	fontFamily: "sans-serif",
	fontWeight: "normal",
};

describe("validateDiamondDoc", () => {
	it("有効な Diamond はエラーなし", () => {
		expect(validateDiamondDoc(validDiamond, "root")).toEqual([]);
	});

	it.each(["x", "y"])("%s が数値でない場合はエラー", (key) => {
		const errors = validateDiamondDoc({ ...validDiamond, [key]: "0" }, "root");
		expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
	});

	it.each(["width", "height"])("%s が数値でない場合はエラー", (key) => {
		const errors = validateDiamondDoc(
			{ ...validDiamond, [key]: "10px" },
			"root",
		);
		expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
	});

	it.each(["width", "height"])("%s が負数はエラー（>= 0）", (key) => {
		const errors = validateDiamondDoc({ ...validDiamond, [key]: -1 }, "root");
		expect(
			errors.some(
				(e) => e.path === `root.${key}` && e.message.includes(">= 0"),
			),
		).toBe(true);
	});

	it("x / y は負数でも許容（座標に下限なし）", () => {
		expect(
			validateDiamondDoc({ ...validDiamond, x: -10, y: -20 }, "root"),
		).toEqual([]);
	});

	it("textType が不正な値はエラー", () => {
		const errors = validateDiamondDoc(
			{ ...validDiamond, textType: "html" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.textType")).toBe(true);
	});

	it("オプション項目がない場合はエラーなし", () => {
		const minimal = { x: 0, y: 0, width: 10, height: 10 };
		expect(validateDiamondDoc(minimal, "root")).toEqual([]);
	});

	it.each(["stroke", "fill", "fontColor", "fontFamily", "fontWeight"])(
		"%s に CSS breakout 文字列はエラー（beyondSchema）",
		(key) => {
			const errors = validateDiamondDoc(
				{ ...validDiamond, [key]: "a;b" },
				"root",
			);
			const hit = errors.find((e) => e.path === `root.${key}`);
			expect(hit).toBeDefined();
			expect(hit?.beyondSchema).toBe(true);
		},
	);

	it('色の sentinel "auto" は許容される', () => {
		expect(
			validateDiamondDoc(
				{ ...validDiamond, stroke: "auto", fill: "auto", fontColor: "auto" },
				"root",
			),
		).toEqual([]);
	});
});
