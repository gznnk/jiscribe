import { describe, it, expect } from "vitest";

import { calcFrameBoxFeatures } from "../../geometry/calcFrameBoxFeatures";

describe("calcFrameBoxFeatures", () => {
	it("回転なしの場合、バウンディングボックスをフレームサイズで返す", () => {
		const result = calcFrameBoxFeatures({
			cx: 50,
			cy: 30,
			width: 100,
			height: 60,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		});
		expect(result.left).toBeCloseTo(0);
		expect(result.right).toBeCloseTo(100);
		expect(result.top).toBeCloseTo(0);
		expect(result.bottom).toBeCloseTo(60);
	});

	it("center, 四隅のプロパティが含まれる", () => {
		const result = calcFrameBoxFeatures({
			cx: 50,
			cy: 30,
			width: 100,
			height: 60,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		});
		expect(result.center).toEqual({ x: 50, y: 30 });
		expect(result.topLeft).toEqual({ x: 0, y: 0 });
		expect(result.topRight).toEqual({ x: 100, y: 0 });
		expect(result.bottomLeft).toEqual({ x: 0, y: 60 });
		expect(result.bottomRight).toEqual({ x: 100, y: 60 });
	});

	it("90度回転した場合、width/heightが入れ替わる", () => {
		const result = calcFrameBoxFeatures({
			cx: 0,
			cy: 0,
			width: 100,
			height: 40,
			rotation: 90,
			scaleX: 1,
			scaleY: 1,
		});
		expect(result.right - result.left).toBeCloseTo(40);
		expect(result.bottom - result.top).toBeCloseTo(100);
	});
});
