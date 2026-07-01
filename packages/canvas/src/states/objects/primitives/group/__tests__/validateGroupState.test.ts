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
	it("valid Group is true", () => {
		expect(isValidGroupState(validGroup)).toBe(true);
	});

	it("type mismatch / missing transform is false", () => {
		expect(isValidGroupState({ ...validGroup, type: "rect" })).toBe(false);
		expect(isValidGroupState({ ...validGroup, scaleX: undefined })).toBe(false);
	});

	it("empty childIds is false (an empty group is a degenerate state)", () => {
		expect(isValidGroupState({ ...validGroup, childIds: [] })).toBe(false);
	});

	it("non-array childIds / non-string elements are false", () => {
		expect(isValidGroupState({ ...validGroup, childIds: "a" })).toBe(false);
		expect(isValidGroupState({ ...validGroup, childIds: ["a", 1] })).toBe(
			false,
		);
	});
});
