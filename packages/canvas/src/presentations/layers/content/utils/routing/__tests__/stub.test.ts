import { calcFrameBoxFeatures, type BoxFeatures } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import { stubPoint } from "../stub";

// center (100,100) 100x60 → AABB: left50 right150 top70 bottom130
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
	it("pushes only the exit-direction axis out to the AABB edge + margin, keeping the endpoint coordinate on the orthogonal axis", () => {
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

	it("margin is applied relative to the edge (even if the endpoint is not on the edge, the axis snaps to edge + margin)", () => {
		// even with point.x=120, exiting right snaps to box.right(150)+margin
		expect(stubPoint({ x: 120, y: 100 }, "right", box, 40)).toEqual({
			x: 190,
			y: 100,
		});
	});
});
