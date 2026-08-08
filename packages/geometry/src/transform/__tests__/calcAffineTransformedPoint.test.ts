import { describe, it, expect } from "vitest";

import { calcAffineTransformedPoint } from "../calcAffineTransformedPoint";

describe("calcAffineTransformedPoint", () => {
	it("returns the point unchanged with no rotation, unit scale and no translation", () => {
		const result = calcAffineTransformedPoint(3, 4, 1, 1, 0, 0, 0);
		expect(result.x).toBeCloseTo(3);
		expect(result.y).toBeCloseTo(4);
	});

	it("applies translation only when there is no rotation", () => {
		const result = calcAffineTransformedPoint(0, 0, 1, 1, 0, 10, 20);
		expect(result.x).toBeCloseTo(10);
		expect(result.y).toBeCloseTo(20);
	});

	it("applies scale only when there is no rotation", () => {
		const result = calcAffineTransformedPoint(2, 3, 2, 3, 0, 0, 0);
		expect(result.x).toBeCloseTo(4);
		expect(result.y).toBeCloseTo(9);
	});

	it("takes the correct result on the angleRad=0 fast path", () => {
		const result = calcAffineTransformedPoint(1, 1, 2, 2, 0, 5, 5);
		expect(result.x).toBeCloseTo(7); // 2*1 + 5
		expect(result.y).toBeCloseTo(7); // 2*1 + 5
	});

	it("applies a 90 degree (π/2) rotation", () => {
		// (1, 0) at scale 1, rotated 90 degrees, no translation -> (0, 1)
		const result = calcAffineTransformedPoint(1, 0, 1, 1, Math.PI / 2, 0, 0);
		expect(result.x).toBeCloseTo(0);
		expect(result.y).toBeCloseTo(1);
	});

	it("applies a 180 degree (π) rotation", () => {
		// (1, 0) at scale 1, rotated 180 degrees, no translation -> (-1, 0)
		const result = calcAffineTransformedPoint(1, 0, 1, 1, Math.PI, 0, 0);
		expect(result.x).toBeCloseTo(-1);
		expect(result.y).toBeCloseTo(0);
	});

	it("applies scale, rotation and translation together", () => {
		// (1, 0) with sx=2, sy=2, a 90 degree rotation, tx=10, ty=20:
		// x = 2*cos(π/2)*1 - 2*sin(π/2)*0 + 10 = 10
		// y = 2*sin(π/2)*1 + 2*cos(π/2)*0 + 20 = 22
		const result = calcAffineTransformedPoint(1, 0, 2, 2, Math.PI / 2, 10, 20);
		expect(result.x).toBeCloseTo(10);
		expect(result.y).toBeCloseTo(22);
	});
});
