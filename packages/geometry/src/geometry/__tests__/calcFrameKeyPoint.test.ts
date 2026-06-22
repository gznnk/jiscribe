import { describe, it, expect } from "vitest";

import { calcFrameKeyPoint } from "../../geometry/calcFrameKeyPoint";
import { calcFrameKeyPoints } from "../../geometry/calcFrameKeyPoints";
import type { KeyPointId } from "../../types/KeyPoints";

const frame0 = {
	cx: 50,
	cy: 30,
	width: 100,
	height: 60,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

const allKeyPointIds: KeyPointId[] = [
	"topLeft",
	"topCenter",
	"topRight",
	"rightCenter",
	"bottomRight",
	"bottomCenter",
	"bottomLeft",
	"leftCenter",
];

describe("calcFrameKeyPoint", () => {
	it("回転なしの場合、指定した1点を正しく返す", () => {
		expect(calcFrameKeyPoint(frame0, "topLeft")).toEqual({ x: 0, y: 0 });
		expect(calcFrameKeyPoint(frame0, "rightCenter")).toEqual({ x: 100, y: 30 });
		expect(calcFrameKeyPoint(frame0, "bottomCenter")).toEqual({ x: 50, y: 60 });
	});

	it("90度回転した場合、calcFrameKeyPoints と一致する", () => {
		const frame = { ...frame0, rotation: 90 };
		const single = calcFrameKeyPoint(frame, "topCenter");
		expect(single.x).toBeCloseTo(80);
		expect(single.y).toBeCloseTo(30);
	});

	it("全ての key point で calcFrameKeyPoints と同じ座標を返す", () => {
		const frame = { ...frame0, rotation: 37, scaleX: 1.5, scaleY: 0.8 };
		const all = calcFrameKeyPoints(frame);
		for (const id of allKeyPointIds) {
			const single = calcFrameKeyPoint(frame, id);
			expect(single.x).toBeCloseTo(all[id].x);
			expect(single.y).toBeCloseTo(all[id].y);
		}
	});
});
