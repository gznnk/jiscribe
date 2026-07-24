import { describe, it, expect } from "vitest";

import { calcAffineTransformedPoint } from "../calcAffineTransformedPoint";
import { calcInverseAffineTransformedPoint } from "../calcInverseAffineTransformedPoint";

describe("calcInverseAffineTransformedPoint", () => {
	it("変換の逆変換で元の点に戻る（回転なし）", () => {
		const srcX = 3;
		const srcY = 4;
		const transformed = calcAffineTransformedPoint(srcX, srcY, 2, 3, 0, 10, 20);
		const restored = calcInverseAffineTransformedPoint(
			transformed.x,
			transformed.y,
			2,
			3,
			0,
			10,
			20,
		);
		expect(restored.x).toBeCloseTo(srcX);
		expect(restored.y).toBeCloseTo(srcY);
	});

	it("変換の逆変換で元の点に戻る（90度回転あり）", () => {
		const srcX = 1;
		const srcY = 2;
		const angleRad = Math.PI / 2;
		const transformed = calcAffineTransformedPoint(
			srcX,
			srcY,
			1,
			1,
			angleRad,
			5,
			5,
		);
		const restored = calcInverseAffineTransformedPoint(
			transformed.x,
			transformed.y,
			1,
			1,
			angleRad,
			5,
			5,
		);
		expect(restored.x).toBeCloseTo(srcX);
		expect(restored.y).toBeCloseTo(srcY);
	});

	it("変換の逆変換で元の点に戻る（任意の角度）", () => {
		const srcX = 5;
		const srcY = -3;
		const angleRad = 0.7854; // 約45度
		const transformed = calcAffineTransformedPoint(
			srcX,
			srcY,
			2,
			0.5,
			angleRad,
			-10,
			7,
		);
		const restored = calcInverseAffineTransformedPoint(
			transformed.x,
			transformed.y,
			2,
			0.5,
			angleRad,
			-10,
			7,
		);
		expect(restored.x).toBeCloseTo(srcX);
		expect(restored.y).toBeCloseTo(srcY);
	});

	it("回転なし（angleRad=0）の最適化パスが正しく動作する", () => {
		const result = calcInverseAffineTransformedPoint(12, 15, 2, 3, 0, 4, 6);
		expect(result.x).toBeCloseTo(4); // (12 - 4) / 2
		expect(result.y).toBeCloseTo(3); // (15 - 6) / 3
	});
});
