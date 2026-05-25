import { describe, it, expect } from "vitest";

import { convertPointsToFrame } from "../../geometry/convertPointsToFrame";

describe("convertPointsToFrame", () => {
	it("空配列の場合はゼロフレームを返す", () => {
		const result = convertPointsToFrame([]);
		expect(result).toEqual({
			cx: 0,
			cy: 0,
			width: 0,
			height: 0,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		});
	});

	it("1点の場合は幅・高さ0のフレームを返す", () => {
		const result = convertPointsToFrame([{ x: 10, y: 20 }]);
		expect(result.cx).toBe(10);
		expect(result.cy).toBe(20);
		expect(result.width).toBe(0);
		expect(result.height).toBe(0);
	});

	it("矩形の4点から正しいフレームを生成する", () => {
		const result = convertPointsToFrame([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 60 },
			{ x: 0, y: 60 },
		]);
		expect(result.cx).toBe(50);
		expect(result.cy).toBe(30);
		expect(result.width).toBe(100);
		expect(result.height).toBe(60);
		expect(result.rotation).toBe(0);
		expect(result.scaleX).toBe(1);
		expect(result.scaleY).toBe(1);
	});
});
