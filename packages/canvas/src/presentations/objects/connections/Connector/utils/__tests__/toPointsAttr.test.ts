import { describe, it, expect } from "vitest";

import { toPointsAttr } from "../toPointsAttr";

describe("toPointsAttr", () => {
	it("returns an empty string for an empty array", () => {
		expect(toPointsAttr([])).toBe("");
	});

	it("returns 'x,y' for a single point", () => {
		expect(toPointsAttr([{ x: 3, y: 4 }])).toBe("3,4");
	});

	it("turns multiple points into a space-separated 'x,y' list", () => {
		expect(
			toPointsAttr([
				{ x: 0, y: 0 },
				{ x: 100, y: 50 },
				{ x: 200, y: 0 },
			]),
		).toBe("0,0 100,50 200,0");
	});

	it("stringifies fractional coordinates as-is", () => {
		expect(
			toPointsAttr([
				{ x: 1.5, y: -2.25 },
				{ x: 10, y: 0 },
			]),
		).toBe("1.5,-2.25 10,0");
	});
});
