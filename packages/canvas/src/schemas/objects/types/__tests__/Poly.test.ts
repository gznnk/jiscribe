import { describe, expect, it } from "vitest";

import { isPoly } from "../Poly";

describe("isPoly", () => {
	it("accepts an object with a valid Point array", () => {
		expect(
			isPoly({
				points: [
					{ x: 0, y: 0 },
					{ x: 10, y: 20 },
				],
			}),
		).toBe(true);
	});

	it("accepts an empty points array (every returns true)", () => {
		expect(isPoly({ points: [] })).toBe(true);
	});

	it("rejects when the points property is absent", () => {
		expect(isPoly({})).toBe(false);
	});

	it("rejects when points is not an array", () => {
		expect(isPoly({ points: "nope" })).toBe(false);
	});

	it("rejects when an element is not a Point", () => {
		expect(isPoly({ points: [{ x: 0, y: 0 }, { x: 1 }] })).toBe(false);
		expect(isPoly({ points: [null] })).toBe(false);
	});

	it("rejects non-objects", () => {
		expect(isPoly(null)).toBe(false);
		expect(isPoly(undefined)).toBe(false);
		expect(isPoly([])).toBe(false);
	});
});
