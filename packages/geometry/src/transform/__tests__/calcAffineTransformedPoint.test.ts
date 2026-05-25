import { describe, it, expect } from "vitest";

import { calcAffineTransformedPoint } from "../calcAffineTransformedPoint";

describe("calcAffineTransformedPoint", () => {
	it("回転なし・スケール1・平行移動なしは元の点をそのまま返す", () => {
		const result = calcAffineTransformedPoint(3, 4, 1, 1, 0, 0, 0);
		expect(result.x).toBeCloseTo(3);
		expect(result.y).toBeCloseTo(4);
	});

	it("回転なしで平行移動のみ適用する", () => {
		const result = calcAffineTransformedPoint(0, 0, 1, 1, 0, 10, 20);
		expect(result.x).toBeCloseTo(10);
		expect(result.y).toBeCloseTo(20);
	});

	it("回転なしでスケールのみ適用する", () => {
		const result = calcAffineTransformedPoint(2, 3, 2, 3, 0, 0, 0);
		expect(result.x).toBeCloseTo(4);
		expect(result.y).toBeCloseTo(9);
	});

	it("回転なし（theta=0）の最適化パスが正しく動作する", () => {
		const result = calcAffineTransformedPoint(1, 1, 2, 2, 0, 5, 5);
		expect(result.x).toBeCloseTo(7); // 2*1 + 5
		expect(result.y).toBeCloseTo(7); // 2*1 + 5
	});

	it("90度（π/2）回転を適用する", () => {
		// (1, 0) をスケール1・90度回転・移動なし → (0, 1)
		const result = calcAffineTransformedPoint(1, 0, 1, 1, Math.PI / 2, 0, 0);
		expect(result.x).toBeCloseTo(0);
		expect(result.y).toBeCloseTo(1);
	});

	it("180度（π）回転を適用する", () => {
		// (1, 0) をスケール1・180度回転・移動なし → (-1, 0)
		const result = calcAffineTransformedPoint(1, 0, 1, 1, Math.PI, 0, 0);
		expect(result.x).toBeCloseTo(-1);
		expect(result.y).toBeCloseTo(0);
	});

	it("スケール・回転・平行移動を同時に適用する", () => {
		// (1, 0) をsx=2, sy=2, 90度回転, tx=10, ty=20
		// 変換後: x = 2*cos(π/2)*1 - 2*sin(π/2)*0 + 10 = 10
		//         y = 2*sin(π/2)*1 + 2*cos(π/2)*0 + 20 = 22
		const result = calcAffineTransformedPoint(1, 0, 2, 2, Math.PI / 2, 10, 20);
		expect(result.x).toBeCloseTo(10);
		expect(result.y).toBeCloseTo(22);
	});
});
