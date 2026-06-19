import { describe, it, expect } from "vitest";

import { validateEllipseDoc } from "../validateEllipseDoc";

const validEllipse = {
	cx: 50,
	cy: 50,
	rx: 30,
	ry: 20,
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

describe("validateEllipseDoc", () => {
	it("有効な Ellipse はエラーなし", () => {
		expect(validateEllipseDoc(validEllipse, "root")).toEqual([]);
	});

	it("cx が数値でない場合はエラー", () => {
		const errors = validateEllipseDoc({ ...validEllipse, cx: "50" }, "root");
		expect(errors.some((e) => e.path === "root.cx")).toBe(true);
	});

	it("cy が数値でない場合はエラー", () => {
		const errors = validateEllipseDoc({ ...validEllipse, cy: null }, "root");
		expect(errors.some((e) => e.path === "root.cy")).toBe(true);
	});

	it("rx が数値でない場合はエラー", () => {
		const errors = validateEllipseDoc({ ...validEllipse, rx: "30px" }, "root");
		expect(errors.some((e) => e.path === "root.rx")).toBe(true);
	});

	it("ry が数値でない場合はエラー", () => {
		const errors = validateEllipseDoc(
			{ ...validEllipse, ry: undefined },
			"root",
		);
		expect(errors.some((e) => e.path === "root.ry")).toBe(true);
	});

	it("textType が不正な値はエラー", () => {
		const errors = validateEllipseDoc(
			{ ...validEllipse, textType: "html" },
			"root",
		);
		expect(errors.some((e) => e.path === "root.textType")).toBe(true);
	});

	it("オプション項目がない場合はエラーなし", () => {
		const minimal = { cx: 0, cy: 0, rx: 10, ry: 10 };
		expect(validateEllipseDoc(minimal, "root")).toEqual([]);
	});
});
