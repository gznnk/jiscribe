import { describe, expect, it } from "vitest";

import { isGroupState } from "../GroupState";

describe("isGroupState", () => {
	it("type=group かつ childIds 配列を持てば受け入れる", () => {
		expect(isGroupState({ type: "group", childIds: [] })).toBe(true);
		expect(isGroupState({ type: "group", childIds: ["a", "b"] })).toBe(true);
	});

	it("type が group でなければ拒否する", () => {
		expect(isGroupState({ type: "rect", childIds: [] })).toBe(false);
	});

	it("childIds が無い／配列でなければ拒否する", () => {
		expect(isGroupState({ type: "group" })).toBe(false);
		expect(isGroupState({ type: "group", childIds: "a" })).toBe(false);
	});

	it("オブジェクト以外を拒否する", () => {
		expect(isGroupState(null)).toBe(false);
		expect(isGroupState(undefined)).toBe(false);
		expect(isGroupState("group")).toBe(false);
	});
});
