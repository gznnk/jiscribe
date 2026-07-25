import { describe, it, expect } from "vitest";

import { calcVectorAngleRad } from "../calcVectorAngleRad";

describe("calcVectorAngleRad", () => {
	it("returns 0 radians pointing right", () => {
		expect(calcVectorAngleRad(1, 0, 0, 0)).toBeCloseTo(0);
	});

	it("returns π/2 radians pointing down", () => {
		expect(calcVectorAngleRad(0, 1, 0, 0)).toBeCloseTo(Math.PI / 2);
	});

	it("returns ±π radians pointing left", () => {
		expect(Math.abs(calcVectorAngleRad(-1, 0, 0, 0))).toBeCloseTo(Math.PI);
	});

	it("returns -π/2 radians pointing up", () => {
		expect(calcVectorAngleRad(0, -1, 0, 0)).toBeCloseTo(-Math.PI / 2);
	});

	it("works with an origin other than (0, 0)", () => {
		// (1,1) -> (2,1) points right
		expect(calcVectorAngleRad(2, 1, 1, 1)).toBeCloseTo(0);
	});
});
