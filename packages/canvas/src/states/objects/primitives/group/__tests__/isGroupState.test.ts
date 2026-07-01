import { describe, expect, it } from "vitest";

import { isGroupState } from "../GroupState";

describe("isGroupState", () => {
	it("accepts when type=group and it has a childIds array", () => {
		expect(isGroupState({ type: "group", childIds: [] })).toBe(true);
		expect(isGroupState({ type: "group", childIds: ["a", "b"] })).toBe(true);
	});

	it("rejects when type is not group", () => {
		expect(isGroupState({ type: "rect", childIds: [] })).toBe(false);
	});

	it("rejects when childIds is missing or not an array", () => {
		expect(isGroupState({ type: "group" })).toBe(false);
		expect(isGroupState({ type: "group", childIds: "a" })).toBe(false);
	});

	it("rejects non-objects", () => {
		expect(isGroupState(null)).toBe(false);
		expect(isGroupState(undefined)).toBe(false);
		expect(isGroupState("group")).toBe(false);
	});
});
