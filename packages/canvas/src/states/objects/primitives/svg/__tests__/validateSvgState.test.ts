import { describe, expect, it } from "vitest";

import { isValidSvgState } from "../validateSvgState";

const validSvg = {
	id: "v1",
	type: "svg",
	cx: 0,
	cy: 0,
	width: 100,
	height: 100,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	svgText: "<svg></svg>",
};

describe("isValidSvgState", () => {
	it("valid Svg is true", () => {
		expect(isValidSvgState(validSvg)).toBe(true);
	});

	it("type mismatch / missing required geometry is false", () => {
		expect(isValidSvgState({ ...validSvg, type: "rect" })).toBe(false);
		expect(isValidSvgState({ ...validSvg, width: undefined })).toBe(false);
	});

	it("negative width / height is false (minimum: 0)", () => {
		expect(isValidSvgState({ ...validSvg, height: -1 })).toBe(false);
	});

	it("svgText that is not a string / missing is false", () => {
		expect(isValidSvgState({ ...validSvg, svgText: undefined })).toBe(false);
		expect(isValidSvgState({ ...validSvg, svgText: 123 })).toBe(false);
	});
});
