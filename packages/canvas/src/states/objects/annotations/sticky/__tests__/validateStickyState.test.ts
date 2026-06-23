import { describe, expect, it } from "vitest";

import { isValidStickyState } from "../validateStickyState";

const validSticky = {
	id: "s1",
	type: "sticky",
	cx: 0,
	cy: 0,
	width: 100,
	height: 100,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	fill: "#ffeb3b",
	fontSize: 14,
};

describe("isValidStickyState", () => {
	it("有効な Sticky は true", () => {
		expect(isValidStickyState(validSticky)).toBe(true);
	});

	it("type 不一致 / 必須ジオメトリ欠落は false", () => {
		expect(isValidStickyState({ ...validSticky, type: "rect" })).toBe(false);
		expect(isValidStickyState({ ...validSticky, cx: undefined })).toBe(false);
	});

	it("width / height が負数は false（minimum: 0）", () => {
		expect(isValidStickyState({ ...validSticky, width: -1 })).toBe(false);
	});

	it("fontSize < 1 は false（>= 1）", () => {
		expect(isValidStickyState({ ...validSticky, fontSize: 0 })).toBe(false);
	});

	it("CSS インジェクションを含む fontFamily は false", () => {
		expect(
			isValidStickyState({ ...validSticky, fontFamily: "Arial; } body {" }),
		).toBe(false);
	});
});
