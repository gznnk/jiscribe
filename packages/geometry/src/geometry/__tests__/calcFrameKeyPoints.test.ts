import { describe, it, expect } from "vitest";

import { calcFrameKeyPoints } from "../../geometry/calcFrameKeyPoints";
import type { TransformedFrame } from "../../types/TransformedFrame";

const frame0: TransformedFrame = {
	cx: 50,
	cy: 30,
	width: 100,
	height: 60,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

describe("calcFrameKeyPoints", () => {
	it("回転なしの場合、各キーポイントを正しく返す", () => {
		const kp = calcFrameKeyPoints(frame0);
		expect(kp.topLeft).toEqual({ x: 0, y: 0 });
		expect(kp.topRight).toEqual({ x: 100, y: 0 });
		expect(kp.bottomLeft).toEqual({ x: 0, y: 60 });
		expect(kp.bottomRight).toEqual({ x: 100, y: 60 });
		expect(kp.topCenter).toEqual({ x: 50, y: 0 });
		expect(kp.bottomCenter).toEqual({ x: 50, y: 60 });
		expect(kp.leftCenter).toEqual({ x: 0, y: 30 });
		expect(kp.rightCenter).toEqual({ x: 100, y: 30 });
	});

	it("90度回転した場合、topCenterが左側に移動する", () => {
		const kp = calcFrameKeyPoints({ ...frame0, rotation: 90 });
		// topCenter (0,-30) → 90度回転 → (30, 0) → +center(50,30) → (80, 30)
		expect(kp.topCenter.x).toBeCloseTo(80);
		expect(kp.topCenter.y).toBeCloseTo(30);
	});

	it("8つのキーポイントがすべて返る", () => {
		const kp = calcFrameKeyPoints(frame0);
		expect(kp).toHaveProperty("topLeft");
		expect(kp).toHaveProperty("topCenter");
		expect(kp).toHaveProperty("topRight");
		expect(kp).toHaveProperty("rightCenter");
		expect(kp).toHaveProperty("bottomRight");
		expect(kp).toHaveProperty("bottomCenter");
		expect(kp).toHaveProperty("bottomLeft");
		expect(kp).toHaveProperty("leftCenter");
	});
});
