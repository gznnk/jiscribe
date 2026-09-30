import { describe, it, expect } from "vitest";

import { calcFrameCenterFromTopLeft } from "../../geometry/calcFrameCenterFromTopLeft";
import { calcFrameKeyPoint } from "../../geometry/calcFrameKeyPoint";
import type { Dimensions, Transform } from "../../types";

const SIZE: Dimensions = { width: 40, height: 20 };

describe("calcFrameCenterFromTopLeft", () => {
	it("is half a box down and to the right of the corner when upright", () => {
		expect(
			calcFrameCenterFromTopLeft({ x: 80, y: 40 }, SIZE, {
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			}),
		).toEqual({ x: 100, y: 50 });
	});

	it("answers the corner itself for a zero-sized box", () => {
		expect(
			calcFrameCenterFromTopLeft(
				{ x: 5, y: 6 },
				{ width: 0, height: 0 },
				{ rotation: 45, scaleX: -1, scaleY: 1 },
			),
		).toEqual({ x: 5, y: 6 });
	});

	// The pair's reason for existing: a box re-derived from its content is rebuilt
	// around the corner it was drawn at, so one direction has to undo the other
	// exactly, flips and rotation included.
	it.each<Transform>([
		{ rotation: 0, scaleX: 1, scaleY: 1 },
		{ rotation: 37, scaleX: 1, scaleY: 1 },
		{ rotation: 90, scaleX: -1, scaleY: 1 },
		{ rotation: 210, scaleX: -1, scaleY: -1 },
	])("round-trips the frame's top-left key point under %o", (transform) => {
		const center = calcFrameCenterFromTopLeft({ x: 12.5, y: -7.25 }, SIZE, {
			...transform,
		});
		const corner = calcFrameKeyPoint(
			{ cx: center.x, cy: center.y, ...SIZE, ...transform },
			"topLeft",
		);
		expect(corner.x).toBeCloseTo(12.5);
		expect(corner.y).toBeCloseTo(-7.25);
	});
});
