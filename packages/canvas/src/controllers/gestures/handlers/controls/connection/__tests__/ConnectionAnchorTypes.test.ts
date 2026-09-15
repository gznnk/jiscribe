import { describe, expect, it } from "vitest";

import { AnchorHandleIds, isAnchorHandleId } from "../ConnectionAnchorTypes";

describe("isAnchorHandleId", () => {
	it.each(AnchorHandleIds)("accepts the AnchorHandleId %s", (id) => {
		expect(isAnchorHandleId(id)).toBe(true);
	});

	it("accepts 'center' as a handle", () => {
		expect(isAnchorHandleId("center")).toBe(true);
	});

	it("rejects invalid strings", () => {
		expect(isAnchorHandleId("top")).toBe(false);
		expect(isAnchorHandleId("")).toBe(false);
	});

	it("rejects non-string types", () => {
		expect(isAnchorHandleId(null)).toBe(false);
		expect(isAnchorHandleId(undefined)).toBe(false);
		expect(isAnchorHandleId(42)).toBe(false);
		expect(isAnchorHandleId({})).toBe(false);
	});
});
