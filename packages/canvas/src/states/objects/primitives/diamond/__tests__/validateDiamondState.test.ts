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
	it("有効な Diamond は true", () => {
		expect(isValidDiamondState(validDiamond)).toBe(true);
	});

	it("type 不一致 / 必須ジオメトリ欠落は false", () => {
		expect(isValidDiamondState({ ...validDiamond, type: "rect" })).toBe(false);
		expect(isValidDiamondState({ ...validDiamond, height: undefined })).toBe(
			false,
		);
	});

	it("width / height が負数は false（minimum: 0）", () => {
		expect(isValidDiamondState({ ...validDiamond, width: -1 })).toBe(false);
		expect(isValidDiamondState({ ...validDiamond, height: -1 })).toBe(false);
	});

	it("fontSize < 1 は false（>= 1）", () => {
		expect(isValidDiamondState({ ...validDiamond, fontSize: 0 })).toBe(false);
	});

	it("CSS インジェクションを含む fill は false", () => {
		expect(isValidDiamondState({ ...validDiamond, fill: "a; } body {" })).toBe(
			false,
		);
	});
});
