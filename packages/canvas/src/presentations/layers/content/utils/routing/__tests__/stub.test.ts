import { calcFrameBoxFeatures, type BoxFeatures } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import { stubPoint } from "../stub";

// 中心 (100,100) 100x60 → AABB: left50 right150 top70 bottom130
const box: BoxFeatures = calcFrameBoxFeatures({
	cx: 100,
	cy: 100,
	width: 100,
	height: 60,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
});

describe("stubPoint", () => {
	it("退出方向の軸だけ AABB 辺 + margin へ押し出し、直交軸は端点座標を保つ", () => {
		expect(stubPoint({ x: 150, y: 100 }, "right", box, 20)).toEqual({
			x: 170, // right(150) + 20
			y: 100,
		});
		expect(stubPoint({ x: 50, y: 100 }, "left", box, 20)).toEqual({
			x: 30, // left(50) - 20
			y: 100,
		});
		expect(stubPoint({ x: 100, y: 70 }, "up", box, 20)).toEqual({
			x: 100,
			y: 50, // top(70) - 20
		});
		expect(stubPoint({ x: 100, y: 130 }, "down", box, 20)).toEqual({
			x: 100,
			y: 150, // bottom(130) + 20
		});
	});

	it("margin は辺基準で適用される（端点が辺上に無くても軸方向は辺 + margin）", () => {
		// point.x=120 でも right 退出は box.right(150)+margin にスナップする
		expect(stubPoint({ x: 120, y: 100 }, "right", box, 40)).toEqual({
			x: 190,
			y: 100,
		});
	});
});
