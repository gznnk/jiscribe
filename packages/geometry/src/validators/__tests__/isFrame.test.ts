import { describe, it, expect } from "vitest";

import { isFrame } from "../isFrame";

describe("isFrame", () => {
	it("returns true for a valid Frame", () => {
		expect(isFrame({ cx: 50, cy: 30, width: 100, height: 60 })).toBe(true);
		expect(isFrame({ cx: 0, cy: 0, width: 0, height: 0 })).toBe(true);
	});

	it("returns false for a negative width", () => {
		expect(isFrame({ cx: 0, cy: 0, width: -1, height: 60 })).toBe(false);
	});

	it("returns false for a negative height", () => {
		expect(isFrame({ cx: 0, cy: 0, width: 100, height: -1 })).toBe(false);
	});

	it("returns false when a property is missing", () => {
		expect(isFrame({ cy: 0, width: 100, height: 60 })).toBe(false);
		expect(isFrame({ cx: 50, cy: 30, width: 100 })).toBe(false);
	});

	it("returns false when cx is not a number", () => {
		expect(isFrame({ cx: "50", cy: 30, width: 100, height: 60 })).toBe(false);
	});

	it("returns false for null", () => {
		expect(isFrame(null)).toBe(false);
	});
});
