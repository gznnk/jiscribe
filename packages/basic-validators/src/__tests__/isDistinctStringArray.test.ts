import { describe, it, expect } from "vitest";

import { isDistinctStringArray } from "../isDistinctStringArray";

describe("isDistinctStringArray", () => {
	it("returns true for distinct strings and for an empty array", () => {
		expect(isDistinctStringArray(["a", "b"])).toBe(true);
		expect(isDistinctStringArray(["a", "A", "a "])).toBe(true);
		expect(isDistinctStringArray([])).toBe(true);
	});

	it("returns false when a string appears twice", () => {
		expect(isDistinctStringArray(["a", "b", "a"])).toBe(false);
	});

	it("returns false when an element is not a string", () => {
		expect(isDistinctStringArray(["a", 1])).toBe(false);
		expect(isDistinctStringArray([null])).toBe(false);
	});

	it("returns false for a sparse array, whose holes are not strings", () => {
		// eslint-disable-next-line no-sparse-arrays
		expect(isDistinctStringArray([,])).toBe(false);
		// eslint-disable-next-line no-sparse-arrays
		expect(isDistinctStringArray(["a", , "b"])).toBe(false);
	});

	it("returns false for a non-array", () => {
		expect(isDistinctStringArray(undefined)).toBe(false);
		expect(isDistinctStringArray(null)).toBe(false);
		expect(isDistinctStringArray("a")).toBe(false);
		expect(isDistinctStringArray({ 0: "a", length: 1 })).toBe(false);
	});
});
