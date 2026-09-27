import { describe, it, expect } from "vitest";

import { calcFrameKeyPoints } from "../../geometry/calcFrameKeyPoints";
import { calcFrameTopLeft } from "../../geometry/calcFrameTopLeft";
import type { TransformedFrame } from "../../types";

const upright: TransformedFrame = {
	cx: 100,
	cy: 50,
	width: 40,
	height: 20,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

describe("calcFrameTopLeft", () => {
	it("is the corner half a box up and to the left of the center when upright", () => {
		expect(calcFrameTopLeft(upright)).toEqual({ x: 80, y: 40 });
	});

	it("turns with the frame: at 90° the pre-transform top-left sits above-right of the center", () => {
		const corner = calcFrameTopLeft({ ...upright, rotation: 90 });
		expect(corner.x).toBeCloseTo(110);
		expect(corner.y).toBeCloseTo(30);
	});

	it("mirrors with a flip, the corner crossing to the other side of the center", () => {
		expect(calcFrameTopLeft({ ...upright, scaleX: -1 })).toEqual({
			x: 120,
			y: 40,
		});
	});

	it("answers the center itself for a zero-sized frame", () => {
		expect(
			calcFrameTopLeft({ ...upright, width: 0, height: 0, rotation: 30 }),
		).toEqual({ x: 100, y: 50 });
	});

	it("agrees with the key point of the same name, whatever the transform", () => {
		const frame: TransformedFrame = {
			...upright,
			rotation: 37,
			scaleX: -1,
			scaleY: -1,
		};
		expect(calcFrameTopLeft(frame)).toEqual(calcFrameKeyPoints(frame).topLeft);
	});
});
