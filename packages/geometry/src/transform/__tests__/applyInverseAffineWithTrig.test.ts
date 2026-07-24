import { describe, it, expect } from "vitest";

import { applyInverseAffineWithTrig } from "../applyInverseAffineWithTrig";
import { calcInverseAffineTransformedPoint } from "../calcInverseAffineTransformedPoint";

describe("applyInverseAffineWithTrig", () => {
	it("cos=1・sin=0 は回転なし（angleRad=0）の特例パスと同一結果になる", () => {
		const result = applyInverseAffineWithTrig(7, 7, 2, 2, 1, 0, 5, 5);
		expect(result.x).toBe(1); // (7-5)/2
		expect(result.y).toBe(1); // (7-5)/2
	});

	it("順変換の逆になっている（90度回転）", () => {
		// (0, 1) は (1, 0) を90度回転した点。逆変換で (1, 0) に戻る
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

	it("同一 angleRad から計算した cos/sin で calcInverseAffineTransformedPoint と一致する", () => {
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
