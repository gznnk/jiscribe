import { describe, expect, it } from "vitest";

import { isValidGroupState } from "../validateGroupState";

const validGroup = {
	id: "g1",
	type: "group",
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	childIds: ["a", "b"],
};

describe("isValidGroupState", () => {
	it("有効な Group は true", () => {
		expect(isValidGroupState(validGroup)).toBe(true);
	});

	it("type 不一致 / transform 欠落は false", () => {
		expect(isValidGroupState({ ...validGroup, type: "rect" })).toBe(false);
		expect(isValidGroupState({ ...validGroup, scaleX: undefined })).toBe(false);
	});

	it("空 childIds は false（空 group は退化状態）", () => {
		expect(isValidGroupState({ ...validGroup, childIds: [] })).toBe(false);
	});

	it("childIds が非配列 / 非文字列要素は false", () => {
		expect(isValidGroupState({ ...validGroup, childIds: "a" })).toBe(false);
		expect(isValidGroupState({ ...validGroup, childIds: ["a", 1] })).toBe(
			false,
		);
	});
});
