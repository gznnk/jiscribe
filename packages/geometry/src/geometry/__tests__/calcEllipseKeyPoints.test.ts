import { describe, it, expect } from "vitest";

import { calcEllipseKeyPoints } from "../../geometry/calcEllipseKeyPoints";

const ellipse0 = {
	cx: 0,
	cy: 0,
	rx: 50,
	ry: 30,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

describe("calcEllipseKeyPoints", () => {
	it("回転なしの場合、各キーポイントを正しく返す", () => {
		const kp = calcEllipseKeyPoints(ellipse0);
		expect(kp.topCenter).toEqual({ x: 0, y: -30 });
		expect(kp.bottomCenter).toEqual({ x: 0, y: 30 });
		expect(kp.leftCenter).toEqual({ x: -50, y: 0 });
		expect(kp.rightCenter).toEqual({ x: 50, y: 0 });
		expect(kp.topLeft).toEqual({ x: -50, y: -30 });
		expect(kp.topRight).toEqual({ x: 50, y: -30 });
		expect(kp.bottomLeft).toEqual({ x: -50, y: 30 });
		expect(kp.bottomRight).toEqual({ x: 50, y: 30 });
	});

	it("90度回転した場合、topCenterとrightCenterが入れ替わる", () => {
		const kp = calcEllipseKeyPoints({ ...ellipse0, rotation: 90 });
		// rightCenter(50,0) → 90度回転 → (0,50) → +center(0,0) → (0,50)
		expect(kp.rightCenter.x).toBeCloseTo(0);
		expect(kp.rightCenter.y).toBeCloseTo(50);
		// topCenter(0,-30) → 90度回転 → (30,0)
		expect(kp.topCenter.x).toBeCloseTo(30);
		expect(kp.topCenter.y).toBeCloseTo(0);
	});

	it("中心点がoffsetされている場合", () => {
		const kp = calcEllipseKeyPoints({ ...ellipse0, cx: 100, cy: 200 });
		expect(kp.topCenter.x).toBeCloseTo(100);
		expect(kp.topCenter.y).toBeCloseTo(170);
		expect(kp.rightCenter.x).toBeCloseTo(150);
		expect(kp.rightCenter.y).toBeCloseTo(200);
	});
});
