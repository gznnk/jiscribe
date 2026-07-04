import { describe, it, expect } from "vitest";

import { calcFrameCornerPoints } from "../../geometry/calcFrameCornerPoints";

describe("calcFrameCornerPoints", () => {
	it("rotation=0の場合は軸平行な4隅を左上から時計回りで返す", () => {
		const corners = calcFrameCornerPoints({
			cx: 100,
			cy: 100,
			width: 100,
			height: 50,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		});
		expect(corners).toEqual([
			{ x: 50, y: 75 },
			{ x: 150, y: 75 },
			{ x: 150, y: 125 },
			{ x: 50, y: 125 },
		]);
	});

	it("rotation=90の場合は4隅が回転後の座標になる", () => {
		const corners = calcFrameCornerPoints({
			cx: 100,
			cy: 100,
			width: 100,
			height: 50,
			rotation: 90,
			scaleX: 1,
			scaleY: 1,
		});
		// 左上(-50,-25)が回転して(cx+25, cy-50)へ
		expect(corners[0].x).toBeCloseTo(125);
		expect(corners[0].y).toBeCloseTo(50);
		expect(corners[2].x).toBeCloseTo(75);
		expect(corners[2].y).toBeCloseTo(150);
	});

	it("scaleX/scaleYが4隅に反映される", () => {
		const corners = calcFrameCornerPoints({
			cx: 0,
			cy: 0,
			width: 100,
			height: 50,
			rotation: 0,
			scaleX: 2,
			scaleY: -1,
		});
		// 左上(-50,-25) -> (-100, 25)
		expect(corners[0]).toEqual({ x: -100, y: 25 });
		// 右下(50,25) -> (100, -25)
		expect(corners[2]).toEqual({ x: 100, y: -25 });
	});
});
