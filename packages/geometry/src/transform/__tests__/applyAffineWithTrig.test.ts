import { describe, it, expect } from "vitest";

import { applyAffineWithTrig } from "../applyAffineWithTrig";
import { calcAffineTransformedPoint } from "../calcAffineTransformedPoint";

describe("applyAffineWithTrig", () => {
	it("matches the no-rotation fast path when cos=1 and sin=0", () => {
		const result = applyAffineWithTrig(1, 1, 2, 2, 1, 0, 5, 5);
		expect(result.x).toBe(7); // 2*1*1 - 2*0*1 + 5
		expect(result.y).toBe(7); // 2*0*1 + 2*1*1 + 5
	});

	it("applies a 90 degree rotation from pre-computed cos/sin", () => {
		// (1, 0) at scale 1, rotated 90 degrees, no translation -> (0, 1)
		const result = applyAffineWithTrig(
			1,
			0,
			1,
			1,
			Math.cos(Math.PI / 2),
			Math.sin(Math.PI / 2),
			0,
			0,
		);
		expect(result.x).toBeCloseTo(0);
		expect(result.y).toBeCloseTo(1);
	});

	it("applies scale, rotation and translation together", () => {
		const result = applyAffineWithTrig(
			1,
			0,
			2,
			2,
			Math.cos(Math.PI / 2),
			Math.sin(Math.PI / 2),
			10,
			20,
		);
		expect(result.x).toBeCloseTo(10);
		expect(result.y).toBeCloseTo(22);
	});

	it("agrees with calcAffineTransformedPoint given cos/sin of the same angle", () => {
		const angleRad = 0.7;
		const cosAngle = Math.cos(angleRad);
		const sinAngle = Math.sin(angleRad);
		const viaHelper = applyAffineWithTrig(
			3,
			-4,
			1.5,
			2,
			cosAngle,
			sinAngle,
			7,
			-2,
		);
		const viaPublic = calcAffineTransformedPoint(
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
