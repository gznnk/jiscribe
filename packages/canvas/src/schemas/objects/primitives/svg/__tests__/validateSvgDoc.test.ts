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
});
