import { describe, it, expect } from "vitest";

import { normalizeAngleDeg } from "../normalizeAngleDeg";

describe("normalizeAngleDeg", () => {
	it("returns 0 for 0", () => {
		expect(normalizeAngleDeg(0)).toBe(0);
	});

	it("returns 0 for 360", () => {
		expect(normalizeAngleDeg(360)).toBe(0);
	});

	it("normalizes angles above 360", () => {
		expect(normalizeAngleDeg(370)).toBeCloseTo(10);
		expect(normalizeAngleDeg(720)).toBe(0);
	});

	it("normalizes negative angles", () => {
		expect(normalizeAngleDeg(-10)).toBeCloseTo(350);
		expect(normalizeAngleDeg(-360)).toBe(0);
		expect(normalizeAngleDeg(-370)).toBeCloseTo(350);
	});

	it("passes angles already within [0, 360) through", () => {
		expect(normalizeAngleDeg(180)).toBe(180);
		expect(normalizeAngleDeg(90)).toBe(90);
	});
});
