import { describe, it, expect } from "vitest";

import { isCenterPoint } from "../isCenterPoint";

describe("isCenterPoint", () => {
	it("returns true for a valid CenterPoint", () => {
		expect(isCenterPoint({ cx: 0, cy: 0 })).toBe(true);
		expect(isCenterPoint({ cx: -5, cy: 3.14 })).toBe(true);
	});

	it("returns false when cx is missing", () => {
		expect(isCenterPoint({ cy: 0 })).toBe(false);
	});

	it("returns false when cy is missing", () => {
		expect(isCenterPoint({ cx: 0 })).toBe(false);
	});

	it("returns false when cx is not a number", () => {
		expect(isCenterPoint({ cx: "0", cy: 0 })).toBe(false);
	});

	it("returns false for null", () => {
		expect(isCenterPoint(null)).toBe(false);
	});
});
