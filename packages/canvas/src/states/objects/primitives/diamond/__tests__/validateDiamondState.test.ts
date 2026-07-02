import { describe, expect, it } from "vitest";

import { isValidDiamondState } from "../validateDiamondState";

const validDiamond = {
	id: "d1",
	type: "diamond",
	cx: 0,
	cy: 0,
	width: 120,
	height: 80,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	stroke: "#000",
	fill: "#fff",
	fontSize: 16,
};

describe("isValidDiamondState", () => {
	it("valid Diamond is true", () => {
		expect(isValidDiamondState(validDiamond)).toBe(true);
	});

	it("type mismatch / missing required geometry is false", () => {
		expect(isValidDiamondState({ ...validDiamond, type: "rect" })).toBe(false);
		expect(isValidDiamondState({ ...validDiamond, height: undefined })).toBe(
			false,
		);
	});

	it("negative width / height is false (minimum: 0)", () => {
		expect(isValidDiamondState({ ...validDiamond, width: -1 })).toBe(false);
		expect(isValidDiamondState({ ...validDiamond, height: -1 })).toBe(false);
	});

	it("fontSize < 1 is false (>= 1)", () => {
		expect(isValidDiamondState({ ...validDiamond, fontSize: 0 })).toBe(false);
	});

	it("fill containing CSS injection is false", () => {
		expect(isValidDiamondState({ ...validDiamond, fill: "a; } body {" })).toBe(
			false,
		);
	});
});
