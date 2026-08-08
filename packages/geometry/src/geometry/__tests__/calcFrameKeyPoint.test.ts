import { describe, it, expect } from "vitest";

import { calcFrameKeyPoint } from "../../geometry/calcFrameKeyPoint";
import { calcFrameKeyPoints } from "../../geometry/calcFrameKeyPoints";
import type { KeyPointId } from "../../types/KeyPoints";
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
	it("returns the requested point when unrotated", () => {
		expect(calcFrameKeyPoint(frame0, "topLeft")).toEqual({ x: 0, y: 0 });
		expect(calcFrameKeyPoint(frame0, "rightCenter")).toEqual({ x: 100, y: 30 });
		expect(calcFrameKeyPoint(frame0, "bottomCenter")).toEqual({ x: 50, y: 60 });
	});

	it("agrees with calcFrameKeyPoints when rotated 90 degrees", () => {
		const frame = { ...frame0, rotation: 90 };
		const single = calcFrameKeyPoint(frame, "topCenter");
		expect(single.x).toBeCloseTo(80);
		expect(single.y).toBeCloseTo(30);
	});

	it("returns the same coordinates as calcFrameKeyPoints for every key point", () => {
		// Regression guard that the single-point and all-points paths agree under general
		// (non ±1) scale. The implementation still handles it, so out-of-domain FlipScale
		// values are cast in.
		const frame = {
			...frame0,
			rotation: 37,
			scaleX: 1.5,
			scaleY: 0.8,
		} as unknown as TransformedFrame;
		const all = calcFrameKeyPoints(frame);
		for (const id of allKeyPointIds) {
			const single = calcFrameKeyPoint(frame, id);
			expect(single.x).toBeCloseTo(all[id].x);
			expect(single.y).toBeCloseTo(all[id].y);
		}
	});
});
