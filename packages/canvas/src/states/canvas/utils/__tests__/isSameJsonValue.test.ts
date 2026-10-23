import { describe, expect, it } from "vitest";

import { isSameJsonFieldsExcept, isSameJsonValue } from "../isSameJsonValue";

describe("isSameJsonValue", () => {
	it("ignores key order at every depth", () => {
		expect(
			isSameJsonValue(
				{ a: 1, b: { c: [1, { d: "x", e: true }] } },
				{ b: { c: [1, { e: true, d: "x" }] }, a: 1 },
			),
		).toBe(true);
	});

	it("keeps array order", () => {
		expect(isSameJsonValue([1, 2], [2, 1])).toBe(false);
	});

	it("counts a key holding undefined as absent", () => {
		expect(isSameJsonValue({ a: 1, b: undefined }, { a: 1 })).toBe(true);
		expect(isSameJsonValue({ a: 1 }, { a: 1, b: null })).toBe(false);
	});

	it("tells apart an array from a record and a missing key from another", () => {
		expect(isSameJsonValue([], {})).toBe(false);
		expect(isSameJsonValue({ a: 1 }, { b: 1 })).toBe(false);
		expect(isSameJsonValue(0, -0)).toBe(true);
	});
});

describe("isSameJsonFieldsExcept", () => {
	it("leaves the ignored key out on both sides, at the top level only", () => {
		expect(
			isSameJsonFieldsExcept(
				{ id: "g", children: [1] },
				{ children: [2], id: "g" },
				"children",
			),
		).toBe(true);
		expect(
			isSameJsonFieldsExcept(
				{ id: "g", nested: { children: [1] } },
				{ id: "g", nested: { children: [2] } },
				"children",
			),
		).toBe(false);
	});
});
