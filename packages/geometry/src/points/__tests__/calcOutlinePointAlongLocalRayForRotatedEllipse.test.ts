import { describe, it, expect } from "vitest";

import { calcOutlinePointAlongLocalRayForRotatedEllipse } from "../../points/calcOutlinePointAlongLocalRayForRotatedEllipse";
import type { Point } from "../../types/Point";
import type { TransformedEllipse } from "../../types/TransformedEllipse";

const baseEllipse: TransformedEllipse = {
	cx: 0,
	cy: 0,
	rx: 50,
	ry: 30,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

const UP: Point = { x: 0, y: -1 };
const RIGHT: Point = { x: 1, y: 0 };

describe("calcOutlinePointAlongLocalRayForRotatedEllipse", () => {
	it("reproduces the center ray when the origin is the ellipse center", () => {
		const point = calcOutlinePointAlongLocalRayForRotatedEllipse(
			baseEllipse,
			{ x: 0, y: 0 },
			RIGHT,
		);

		expect(point!.x).toBeCloseTo(50);
		expect(point!.y).toBeCloseTo(0);
	});

	it("lands on the arc, not the bounding box, for an origin offset along a side", () => {
		// x = 30 is 3/5 of rx, so the arc there sits at y = -ry · 4/5 = -24; the
		// box's top edge would be at -30.
		const point = calcOutlinePointAlongLocalRayForRotatedEllipse(
			baseEllipse,
			{ x: 30, y: 0 },
			UP,
		);

		expect(point!.x).toBeCloseTo(30);
		expect(point!.y).toBeCloseTo(-24);
	});

	it("takes the nearer crossing for an origin outside the ellipse facing it", () => {
		const point = calcOutlinePointAlongLocalRayForRotatedEllipse(
			baseEllipse,
			{ x: -200, y: 0 },
			RIGHT,
		);

		expect(point!.x).toBeCloseTo(-50);
		expect(point!.y).toBeCloseTo(0);
	});

	it("returns null for an origin outside the ellipse facing away", () => {
		expect(
			calcOutlinePointAlongLocalRayForRotatedEllipse(
				baseEllipse,
				{ x: 200, y: 0 },
				RIGHT,
			),
		).toBeNull();
	});

	it("returns null for a ray that passes beside the ellipse", () => {
		expect(
			calcOutlinePointAlongLocalRayForRotatedEllipse(
				baseEllipse,
				{ x: 60, y: 100 },
				UP,
			),
		).toBeNull();
	});

	it("travels on past an origin lying on the arc", () => {
		// Heading outward from the arc there is nothing left to cross; heading
		// inward the far side is the hit.
		expect(
			calcOutlinePointAlongLocalRayForRotatedEllipse(
				baseEllipse,
				{ x: 50, y: 0 },
				RIGHT,
			),
		).toBeNull();
		const inward = calcOutlinePointAlongLocalRayForRotatedEllipse(
			baseEllipse,
			{ x: 50, y: 0 },
			{ x: -1, y: 0 },
		);
		expect(inward!.x).toBeCloseTo(-50);
		expect(inward!.y).toBeCloseTo(0);
	});

	it("returns null for a zero direction or a non-positive radius", () => {
		expect(
			calcOutlinePointAlongLocalRayForRotatedEllipse(
				baseEllipse,
				{ x: 0, y: 0 },
				{ x: 0, y: 0 },
			),
		).toBeNull();
		expect(
			calcOutlinePointAlongLocalRayForRotatedEllipse(
				{ ...baseEllipse, ry: 0 },
				{ x: 0, y: 0 },
				UP,
			),
		).toBeNull();
	});

	it("carries the hit through the ellipse's position, rotation and flip", () => {
		// Rotated 90° clockwise the local up ray heads to world +x, and the y flip
		// mirrors the local x offset before the rotation is applied.
		const point = calcOutlinePointAlongLocalRayForRotatedEllipse(
			{ ...baseEllipse, cx: 100, cy: 200, rotation: 90, scaleY: -1 },
			{ x: 30, y: 0 },
			UP,
		);

		// local hit (30, -24) → flipped (30, 24) → rotated 90° (-24, 30) → moved
		expect(point!.x).toBeCloseTo(100 - 24);
		expect(point!.y).toBeCloseTo(200 + 30);
	});
});
