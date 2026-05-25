import { describe, it, expect } from "vitest";

import { calcRectKeyPoints } from "../../geometry/calcRectKeyPoints";

const rect0 = {
	x: 0,
	y: 0,
	width: 100,
	height: 60,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

describe("calcRectKeyPoints", () => {
	it("回転なしの場合、各キーポイントを正しく返す", () => {
		const kp = calcRectKeyPoints(rect0);
		// center: (50, 30)
		expect(kp.topLeft).toEqual({ x: 0, y: 0 });
		expect(kp.topRight).toEqual({ x: 100, y: 0 });
		expect(kp.bottomLeft).toEqual({ x: 0, y: 60 });
		expect(kp.bottomRight).toEqual({ x: 100, y: 60 });
		expect(kp.topCenter).toEqual({ x: 50, y: 0 });
		expect(kp.bottomCenter).toEqual({ x: 50, y: 60 });
		expect(kp.leftCenter).toEqual({ x: 0, y: 30 });
		expect(kp.rightCenter).toEqual({ x: 100, y: 30 });
	});

	it("90度回転した場合、頂点が正しく回転する", () => {
		const kp = calcRectKeyPoints({
			x: 0,
			y: 0,
			width: 100,
			height: 60,
			rotation: 90,
			scaleX: 1,
			scaleY: 1,
		});
		// center: (50, 30)
		// topLeft(-50,-30) → 90度回転 → (30,-50) → +center → (80,-20)
		expect(kp.topLeft.x).toBeCloseTo(80);
		expect(kp.topLeft.y).toBeCloseTo(-20);
	});

	it("180度回転した場合、対角が入れ替わる", () => {
		const kp = calcRectKeyPoints({ ...rect0, rotation: 180 });
		// center: (50, 30)
		// topLeft(-50,-30) → 180度回転 → (50,30) → +center → (100,60)
		expect(kp.topLeft.x).toBeCloseTo(100);
		expect(kp.topLeft.y).toBeCloseTo(60);
		expect(kp.bottomRight.x).toBeCloseTo(0);
		expect(kp.bottomRight.y).toBeCloseTo(0);
	});
});
