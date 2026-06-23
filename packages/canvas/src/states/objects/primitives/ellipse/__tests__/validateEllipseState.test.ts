import { describe, expect, it } from "vitest";

import { isValidEllipseState } from "../validateEllipseState";

const validEllipse = {
	id: "e1",
	type: "ellipse",
	cx: 0,
	cy: 0,
	width: 100,
	height: 50,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	stroke: "#000",
	fill: "#fff",
	fontSize: 16,
};

describe("isValidEllipseState", () => {
	it("有効な Ellipse は true", () => {
		expect(isValidEllipseState(validEllipse)).toBe(true);
	});

	it("type 不一致 / 必須ジオメトリ欠落は false", () => {
		expect(isValidEllipseState({ ...validEllipse, type: "rect" })).toBe(false);
		expect(isValidEllipseState({ ...validEllipse, height: undefined })).toBe(
			false,
		);
	});

	it("width / height が負数は false（minimum: 0）", () => {
		expect(isValidEllipseState({ ...validEllipse, width: -1 })).toBe(false);
		expect(isValidEllipseState({ ...validEllipse, height: -1 })).toBe(false);
	});

	it("fontSize < 1 は false（>= 1）", () => {
		expect(isValidEllipseState({ ...validEllipse, fontSize: 0 })).toBe(false);
	});

	it("CSS インジェクションを含む fill は false", () => {
		expect(isValidEllipseState({ ...validEllipse, fill: "a; } body {" })).toBe(
			false,
		);
	});
});
