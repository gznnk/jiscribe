import { describe, it, expect } from "vitest";

import { applyAffineWithTrig } from "../applyAffineWithTrig";
import { calcAffineTransformedPoint } from "../calcAffineTransformedPoint";

describe("applyAffineWithTrig", () => {
	it("cos=1・sin=0 は回転なし（angleRad=0）の特例パスと同一結果になる", () => {
		const result = applyAffineWithTrig(1, 1, 2, 2, 1, 0, 5, 5);
		expect(result.x).toBe(7); // 2*1*1 - 2*0*1 + 5
		expect(result.y).toBe(7); // 2*0*1 + 2*1*1 + 5
	});

	it("事前計算した cos/sin で90度回転を適用する", () => {
		// (1, 0) をスケール1・90度回転・移動なし → (0, 1)
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

	it("スケール・回転・平行移動を同時に適用する", () => {
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

	it("同一 angleRad から計算した cos/sin で calcAffineTransformedPoint と一致する", () => {
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
