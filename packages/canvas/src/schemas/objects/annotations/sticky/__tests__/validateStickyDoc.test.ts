import { describe, it, expect } from "vitest";

import { validateStickyDoc } from "../validateStickyDoc";

const validSticky = {
	x: 0,
	y: 0,
	width: 160,
	height: 120,
	rotation: 0,
	flipX: false,
	flipY: false,
	fill: "#fef9c3",
	text: "memo",
	textType: "text",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: "#000",
	fontSize: 14,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
};

describe("validateStickyDoc", () => {
	it("有効な Sticky はエラーなし", () => {
		expect(validateStickyDoc(validSticky, "root")).toEqual([]);
	});

	it("必須の x が数値でない場合はエラー", () => {
		const errors = validateStickyDoc({ ...validSticky, x: "0" }, "root");
		expect(errors.some((e) => e.path === "root.x")).toBe(true);
	});

	it("必須の y が数値でない場合はエラー", () => {
		const errors = validateStickyDoc({ ...validSticky, y: null }, "root");
		expect(errors.some((e) => e.path === "root.y")).toBe(true);
	});

	it("必須の width が数値でない場合はエラー", () => {
		const errors = validateStickyDoc(
			{ ...validSticky, width: undefined },
			"root",
		);
		expect(errors.some((e) => e.path === "root.width")).toBe(true);
	});

	it("必須の height が数値でない場合はエラー", () => {
		const errors = validateStickyDoc(
			{ ...validSticky, height: "120px" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.height")).toBe(true);
	});

	it("textAlign が不正な値はエラー", () => {
		const errors = validateStickyDoc(
			{ ...validSticky, textAlign: "justify" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.textAlign")).toBe(true);
	});

	it("verticalAlign が不正な値はエラー", () => {
		const errors = validateStickyDoc(
			{ ...validSticky, verticalAlign: "baseline" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.verticalAlign")).toBe(true);
	});

	it("fill が string でない場合はエラー", () => {
		const errors = validateStickyDoc(
			{ ...validSticky, fill: 0xfef9c3 },
			"root",
		);
		expect(errors.some((e) => e.path === "root.fill")).toBe(true);
	});

	it("オプション項目がない場合はエラーなし", () => {
		const minimal = { x: 0, y: 0, width: 160, height: 120 };
		expect(validateStickyDoc(minimal, "root")).toEqual([]);
	});

	// ─── 強化 ───
	it("fontSize が数値でない場合はエラー", () => {
		const errors = validateStickyDoc(
			{ ...validSticky, fontSize: "14" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.fontSize")).toBe(true);
	});

	it("rotation が数値でない場合はエラー", () => {
		const errors = validateStickyDoc({ ...validSticky, rotation: "0" }, "root");
		expect(errors.some((e) => e.path === "root.rotation")).toBe(true);
	});

	it.each(["flipX", "flipY"])("%s が boolean でない場合はエラー", (key) => {
		const errors = validateStickyDoc({ ...validSticky, [key]: 1 }, "root");
		expect(errors.some((e) => e.path === `root.${key}`)).toBe(true);
	});

	it.each(["fill", "fontColor", "fontFamily", "fontWeight"])(
		"%s に CSS breakout 文字列はエラー（beyondSchema）",
		(key) => {
			const errors = validateStickyDoc(
				{ ...validSticky, [key]: "a;b" },
				"root",
			);
			const hit = errors.find((e) => e.path === `root.${key}`);
			expect(hit).toBeDefined();
			expect(hit?.beyondSchema).toBe(true);
		},
	);

	it("sticky は stroke を持たないため stroke は検証しない", () => {
		// sticky は枠線スタイルを持たないので、不正な stroke でも素通り
		expect(
			validateStickyDoc({ ...validSticky, stroke: "a;b" }, "root"),
		).toEqual([]);
	});

	// ─── 強化: 数値下限 ───
	it.each(["width", "height"])("%s が負数はエラー（>= 0）", (key) => {
		const errors = validateStickyDoc({ ...validSticky, [key]: -1 }, "root");
		expect(
			errors.some(
				(e) => e.path === `root.${key}` && e.message.includes(">= 0"),
			),
		).toBe(true);
	});

	it("fontSize < 1 はエラー（>= 1）", () => {
		const errors = validateStickyDoc({ ...validSticky, fontSize: 0 }, "root");
		expect(
			errors.some(
				(e) => e.path === "root.fontSize" && e.message.includes(">= 1"),
			),
		).toBe(true);
	});

	it('色の sentinel "auto" は許容される', () => {
		expect(
			validateStickyDoc(
				{ ...validSticky, fill: "auto", fontColor: "auto" },
				"root",
			),
		).toEqual([]);
	});
});
