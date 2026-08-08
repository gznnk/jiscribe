import { describe, it, expect } from "vitest";

import { calcOutlinePointAlongLocalRayForPolygon } from "../../points/calcOutlinePointAlongLocalRayForPolygon";
import type { Point } from "../../types/Point";
import type { TransformedFrame } from "../../types/TransformedFrame";

const baseFrame: TransformedFrame = {
	cx: 0,
	cy: 0,
	width: 100,
	height: 100,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

// Home-plate pentagon (width 100 / height 100, tip 0.3): the bottom 30 tapers to
// a point, so the vertical edges only span y = -50 … 20.
const homePlate: Point[] = [
	{ x: -50, y: -50 },
	{ x: 50, y: -50 },
	{ x: 50, y: 20 },
	{ x: 0, y: 50 },
	{ x: -50, y: 20 },
];

const LEFT: Point = { x: -1, y: 0 };
const DOWN: Point = { x: 0, y: 1 };

describe("calcOutlinePointAlongLocalRayForPolygon", () => {
	it("hits the outline at the origin's height, not at the shape's vertical center", () => {
		// origin lifted to the middle of the rectangular band (y = -15)
		const point = calcOutlinePointAlongLocalRayForPolygon(
			homePlate,
			baseFrame,
			{ x: 0, y: -15 },
			LEFT,
		);

		expect(point).toEqual({ x: -50, y: -15 });
	});

	it("reproduces the center ray when the origin is the shape center", () => {
		const point = calcOutlinePointAlongLocalRayForPolygon(
			homePlate,
			baseFrame,
			{ x: 0, y: 0 },
			LEFT,
		);

		expect(point).toEqual({ x: -50, y: 0 });
	});

	it("reaches the tapered tip when travelling down the shape's axis", () => {
		const point = calcOutlinePointAlongLocalRayForPolygon(
			homePlate,
			baseFrame,
			{ x: 0, y: -15 },
			DOWN,
		);

		expect(point).toEqual({ x: 0, y: 50 });
	});

	it("rotates the ray with the shape", () => {
		// rotated 90°: the local left face points up in world space
		const point = calcOutlinePointAlongLocalRayForPolygon(
			homePlate,
			{ ...baseFrame, rotation: 90 },
			{ x: 0, y: -15 },
			LEFT,
		);

		expect(point!.x).toBeCloseTo(15);
		expect(point!.y).toBeCloseTo(-50);
	});

	it("mirrors the ray with a flipped shape", () => {
		const point = calcOutlinePointAlongLocalRayForPolygon(
			homePlate,
			{ ...baseFrame, scaleX: -1 },
			{ x: 0, y: -15 },
			LEFT,
		);

		expect(point).toEqual({ x: 50, y: -15 });
	});

	it("offsets by the frame center", () => {
		const point = calcOutlinePointAlongLocalRayForPolygon(
			homePlate,
			{ ...baseFrame, cx: 200, cy: 300 },
			{ x: 0, y: -15 },
			LEFT,
		);

		expect(point).toEqual({ x: 150, y: 285 });
	});

	it("returns null for a degenerate polygon", () => {
		expect(
			calcOutlinePointAlongLocalRayForPolygon(
				[{ x: 0, y: 0 }],
				baseFrame,
				{ x: 0, y: 0 },
				LEFT,
			),
		).toBeNull();
	});

	it("returns null when the ray crosses no edge", () => {
		// origin outside the shape, aiming away from it
		expect(
			calcOutlinePointAlongLocalRayForPolygon(
				homePlate,
				baseFrame,
				{ x: -200, y: 0 },
				LEFT,
			),
		).toBeNull();
	});
});
