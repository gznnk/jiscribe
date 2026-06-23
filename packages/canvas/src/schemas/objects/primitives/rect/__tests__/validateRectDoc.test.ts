import { describe, it, expect } from "vitest";

import { validateRectDoc } from "../validateRectDoc";

const validRect = {
	x: 10,
	y: 20,
	width: 100,
	height: 50,
	rotation: 0,
	flipX: false,
	flipY: false,
	stroke: "#000",
	strokeWidth: 2,
	strokeDashType: "solid",
	fill: "#fff",
	text: "hello",
	textType: "text",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: "#000",
	fontSize: 16,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
	rx: 4,
};

describe("validateRectDoc", () => {
	it("有効な Rect はエラーなし", () => {
		expect(validateRectDoc(validRect, "root")).toEqual([]);
	});

	it("必須の x が数値でない場合はエラー", () => {
		const errors = validateRectDoc({ ...validRect, x: "10" }, "root");
		expect(errors.some((e) => e.path === "root.x")).toBe(true);
	});

	it("必須の y が数値でない場合はエラー", () => {
		const errors = validateRectDoc({ ...validRect, y: null }, "root");
		expect(errors.some((e) => e.path === "root.y")).toBe(true);
	});

	it("必須の width が数値でない場合はエラー", () => {
		const errors = validateRectDoc({ ...validRect, width: "100px" }, "root");
		expect(errors.some((e) => e.path === "root.width")).toBe(true);
	});

	it("必須の height が数値でない場合はエラー", () => {
		const errors = validateRectDoc({ ...validRect, height: undefined }, "root");
		expect(errors.some((e) => e.path === "root.height")).toBe(true);
	});

	it("textAlign が不正な値はエラー", () => {
		const errors = validateRectDoc(
			{ ...validRect, textAlign: "justify" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.textAlign")).toBe(true);
	});

	it("verticalAlign が不正な値はエラー", () => {
		const errors = validateRectDoc(
			{ ...validRect, verticalAlign: "baseline" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.verticalAlign")).toBe(true);
	});

	it("strokeDashType が不正な値はエラー", () => {
		const errors = validateRectDoc(
			{ ...validRect, strokeDashType: "double" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.strokeDashType")).toBe(true);
	});

	it("オプション項目がない場合はエラーなし", () => {
		const minimal = { x: 0, y: 0, width: 100, height: 100 };
		expect(validateRectDoc(minimal, "root")).toEqual([]);
	});

	it('色フィールドの sentinel "auto" はエラーなし（テーマ追従）', () => {
		const autoColored = {
			...validRect,
			stroke: "auto",
			fontColor: "auto",
			fill: "auto",
		};
		expect(validateRectDoc(autoColored, "root")).toEqual([]);
	});

	// ─── 強化: CSS インジェクション安全性（beyondSchema） ───
	it.each(["stroke", "fill", "fontColor", "fontFamily", "fontWeight"])(
		"%s に CSS breakout 文字列はエラー（beyondSchema フラグ付き）",
		(key) => {
			const errors = validateRectDoc(
				{ ...validRect, [key]: "red; color: blue" },
				"root",
			);
			const hit = errors.find((e) => e.path === `root.${key}`);
			expect(hit).toBeDefined();
			expect(hit?.beyondSchema).toBe(true);
		},
	);

	it.each(["url(x)", "a{b}", "a/*c*/", "<svg>", "a\\b"])(
		"fill の危険な断片 %s はエラー",
		(bad) => {
			const errors = validateRectDoc({ ...validRect, fill: bad }, "root");
			expect(errors.some((e) => e.path === "root.fill")).toBe(true);
		},
	);

	// ─── 強化: 数値スタイルフィールド ───
	it.each(["strokeWidth", "fontSize", "rx"])(
		"%s が数値でない場合はエラー",
		(key) => {
			const errors = validateRectDoc({ ...validRect, [key]: "3" }, "root");
			expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
		},
	);

	// ─── 強化: transform フィールド ───
	it("rotation が数値でない場合はエラー", () => {
		const errors = validateRectDoc({ ...validRect, rotation: "0" }, "root");
		expect(errors.some((e) => e.path === "root.rotation")).toBe(true);
	});

	it.each(["flipX", "flipY"])("%s が boolean でない場合はエラー", (key) => {
		const errors = validateRectDoc({ ...validRect, [key]: "false" }, "root");
		expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
	});

	it("複数の不正フィールドはすべて報告される", () => {
		const errors = validateRectDoc(
			{ ...validRect, x: "a", fill: "a;b", fontSize: "z" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.x")).toBe(true);
		expect(errors.some((e) => e.path === "root.fill")).toBe(true);
		expect(errors.some((e) => e.path === "root.fontSize")).toBe(true);
	});

	// ─── 強化: 数値下限（スキーマ minimum と一致） ───
	it.each(["width", "height", "rx", "strokeWidth"])(
		"%s が負数はエラー（>= 0）",
		(key) => {
			const errors = validateRectDoc({ ...validRect, [key]: -1 }, "root");
			expect(
				errors.some(
					(e) => e.path === `root.${key}` && e.message.includes(">= 0"),
				),
			).toBe(true);
		},
	);

	it("width/height = 0 は許容（minimum: 0）", () => {
		expect(
			validateRectDoc({ ...validRect, width: 0, height: 0 }, "root"),
		).toEqual([]);
	});

	it("fontSize < 1 はエラー（>= 1）", () => {
		const errors = validateRectDoc({ ...validRect, fontSize: 0 }, "root");
		expect(
			errors.some(
				(e) => e.path === "root.fontSize" && e.message.includes(">= 1"),
			),
		).toBe(true);
	});

	it("x / y は負数でも許容（位置に下限なし）", () => {
		expect(validateRectDoc({ ...validRect, x: -100, y: -50 }, "root")).toEqual(
			[],
		);
	});

	it('色の sentinel "auto" は minimum 強化後も許容される', () => {
		expect(
			validateRectDoc(
				{ ...validRect, stroke: "auto", fill: "auto", fontColor: "auto" },
				"root",
			),
		).toEqual([]);
	});
});
