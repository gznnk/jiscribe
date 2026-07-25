import { describe, it, expect } from "vitest";

import { isEllipse } from "../isEllipse";

describe("isEllipse", () => {
	it("returns true for a valid Ellipse", () => {
		expect(isEllipse({ cx: 0, cy: 0, rx: 50, ry: 30 })).toBe(true);
		expect(isEllipse({ cx: -5, cy: 3, rx: 0, ry: 0 })).toBe(true);
	});

	it("returns false for a negative rx", () => {
		expect(isEllipse({ cx: 0, cy: 0, rx: -1, ry: 30 })).toBe(false);
	});

	it("returns false for a negative ry", () => {
		expect(isEllipse({ cx: 0, cy: 0, rx: 50, ry: -1 })).toBe(false);
	});

	it("returns false when a property is missing", () => {
		expect(isEllipse({ cx: 0, cy: 0, rx: 50 })).toBe(false);
		expect(isEllipse({ cy: 0, rx: 50, ry: 30 })).toBe(false);
	});

	it("returns false for null", () => {
		expect(isEllipse(null)).toBe(false);
	});
});
