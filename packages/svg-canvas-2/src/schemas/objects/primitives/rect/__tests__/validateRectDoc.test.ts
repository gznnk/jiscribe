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
});
