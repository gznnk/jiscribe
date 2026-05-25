import { describe, it, expect } from "vitest";

import { calcBoundingBox } from "../../geometry/calcBoundingBox";

describe("calcBoundingBox", () => {
	it("回転なしの場合、中心座標から単純にバウンディングボックスを計算する", () => {
		const result = calcBoundingBox({
			cx: 100,
			cy: 50,
			width: 80,
			height: 40,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		});
		expect(result.left).toBeCloseTo(60);
		expect(result.right).toBeCloseTo(140);
		expect(result.top).toBeCloseTo(30);
		expect(result.bottom).toBeCloseTo(70);
	});

	it("原点中心の正方形でrotation=0の場合", () => {
		const result = calcBoundingBox({
			cx: 0,
			cy: 0,
			width: 100,
			height: 100,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		});
		expect(result.left).toBeCloseTo(-50);
		expect(result.right).toBeCloseTo(50);
		expect(result.top).toBeCloseTo(-50);
		expect(result.bottom).toBeCloseTo(50);
	});

	it("90度回転した矩形のバウンディングボックスを計算する", () => {
		const result = calcBoundingBox({
			cx: 0,
			cy: 0,
			width: 100,
			height: 40,
			rotation: 90,
			scaleX: 1,
			scaleY: 1,
		});
		// 90度回転するとwidth/heightが入れ替わる
		expect(result.left).toBeCloseTo(-20);
		expect(result.right).toBeCloseTo(20);
		expect(result.top).toBeCloseTo(-50);
		expect(result.bottom).toBeCloseTo(50);
	});

	it("45度回転した正方形は元より大きいバウンディングボックスになる", () => {
		const size = 100;
		const result = calcBoundingBox({
			cx: 0,
			cy: 0,
			width: size,
			height: size,
			rotation: 45,
			scaleX: 1,
			scaleY: 1,
		});
		// 45度回転した正方形のBBは一辺 = size/sqrt(2) * 2 = size*sqrt(2)
		const expected = (size / 2) * Math.SQRT2;
		expect(result.left).toBeCloseTo(-expected);
		expect(result.right).toBeCloseTo(expected);
	});
});
