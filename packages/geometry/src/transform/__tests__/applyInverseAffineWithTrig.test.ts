import { describe, it, expect } from "vitest";

import { applyInverseAffineWithTrig } from "../applyInverseAffineWithTrig";
import { calcInverseAffineTransformedPoint } from "../calcInverseAffineTransformedPoint";

describe("applyInverseAffineWithTrig", () => {
	it("matches the no-rotation fast path when cos=1 and sin=0", () => {
		const result = applyInverseAffineWithTrig(7, 7, 2, 2, 1, 0, 5, 5);
		expect(result.x).toBe(1); // (7-5)/2
		expect(result.y).toBe(1); // (7-5)/2
	});

	it("inverts the forward transform for a 90 degree rotation", () => {
		// (0, 1) is (1, 0) rotated by 90 degrees, so the inverse returns (1, 0).
		const result = applyInverseAffineWithTrig(
			0,
			1,
			1,
			1,
			Math.cos(Math.PI / 2),
			Math.sin(Math.PI / 2),
			0,
			0,
		);
		expect(result.x).toBeCloseTo(1);
		expect(result.y).toBeCloseTo(0);
	});

	it("agrees with calcInverseAffineTransformedPoint given cos/sin of the same angle", () => {
		const angleRad = 0.7;
		const cosAngle = Math.cos(angleRad);
		const sinAngle = Math.sin(angleRad);
		const viaHelper = applyInverseAffineWithTrig(
			3,
			-4,
			1.5,
			2,
			cosAngle,
			sinAngle,
			7,
			-2,
		);
		const viaPublic = calcInverseAffineTransformedPoint(
			3,
			-4,
			1.5,
			2,
			angleRad,
			7,
			-2,
		);
		expect(viaHelper.x).toBe(viaPublic.x);
		expect(viaHelper.y).toBe(viaPublic.y);
	});
});
