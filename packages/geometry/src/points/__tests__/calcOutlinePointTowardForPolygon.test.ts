import { describe, it, expect } from "vitest";

import { calcOutlinePointTowardForPolygon } from "../../points/calcOutlinePointTowardForPolygon";
import type { Point } from "../../types/Point";
import type { TransformedFrame } from "../../types/TransformedFrame";

const baseFrame: TransformedFrame = {
	cx: 0,
	cy: 0,
	width: 100,
	height: 60,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

// Diamond (width 100 / height 60): vertices at top / right / bottom / left.
const diamond: Point[] = [
	{ x: 0, y: -30 },
	{ x: 50, y: 0 },
	{ x: 0, y: 30 },
	{ x: -50, y: 0 },
];

// Parallelogram (skew 22): top edge shifted right, so the left/right edges slant.
const parallelogram: Point[] = [
	{ x: -28, y: -30 },
	{ x: 50, y: -30 },
	{ x: 28, y: 30 },
	{ x: -50, y: 30 },
];

describe("calcOutlinePointTowardForPolygon", () => {
	it("returns null for a degenerate polygon", () => {
		expect(
			calcOutlinePointTowardForPolygon([{ x: 0, y: 0 }], baseFrame, {
				x: 100,
				y: 0,
			}),
		).toBeNull();
	});

	it("returns null when toward equals the center (zero direction)", () => {
		expect(
			calcOutlinePointTowardForPolygon(diamond, baseFrame, { x: 0, y: 0 }),
		).toBeNull();
	});

	it("lands on the diamond's top vertex for an upward ray", () => {
		const result = calcOutlinePointTowardForPolygon(diamond, baseFrame, {
			x: 0,
			y: -200,
		});
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(0);
		expect(result!.y).toBeCloseTo(-30);
	});

	it("lands on the diamond's right vertex for a rightward ray", () => {
		const result = calcOutlinePointTowardForPolygon(diamond, baseFrame, {
			x: 200,
			y: 0,
		});
		expect(result!.x).toBeCloseTo(50);
		expect(result!.y).toBeCloseTo(0);
	});

	it("lands on the parallelogram's slanted edge, not the bounding box", () => {
		// leftCenter direction: the AABB edge is x=-50, but the true left edge at
		// y=0 sits at x=-39.
		const left = calcOutlinePointTowardForPolygon(parallelogram, baseFrame, {
			x: -50,
			y: 0,
		});
		expect(left!.x).toBeCloseTo(-39);
		expect(left!.y).toBeCloseTo(0);

		const right = calcOutlinePointTowardForPolygon(parallelogram, baseFrame, {
			x: 50,
			y: 0,
		});
		expect(right!.x).toBeCloseTo(39);
		expect(right!.y).toBeCloseTo(0);

		// topCenter still lands on the (slanted) top edge directly above center.
		const top = calcOutlinePointTowardForPolygon(parallelogram, baseFrame, {
			x: 0,
			y: -30,
		});
		expect(top!.x).toBeCloseTo(0);
		expect(top!.y).toBeCloseTo(-30);
	});

	it("follows a 90° rotation", () => {
		// Rotating the diamond 90° maps the left vertex (-50,0) to (0,-50),
		// so an upward ray now lands there.
		const result = calcOutlinePointTowardForPolygon(
			diamond,
			{ ...baseFrame, rotation: 90 },
			{ x: 0, y: -200 },
		);
		expect(result!.x).toBeCloseTo(0);
		expect(result!.y).toBeCloseTo(-50);
	});

	it("follows a horizontal flip (scaleX = -1)", () => {
		const toward: Point = { x: -100, y: -60 };
		const normal = calcOutlinePointTowardForPolygon(
			parallelogram,
			baseFrame,
			toward,
		);
		const flipped = calcOutlinePointTowardForPolygon(
			parallelogram,
			{ ...baseFrame, scaleX: -1 },
			toward,
		);
		// The flip moves the up-left outline hit onto the (now leftmost) vertex.
		expect(flipped!.x).toBeCloseTo(-50);
		expect(flipped!.y).toBeCloseTo(-30);
		// Un-flipped hits the slanted left edge well inside the bounding box.
		expect(normal!.x).toBeGreaterThan(-35);
		expect(normal!.x).toBeLessThan(-28);
	});

	it("respects a concave outline (nearest crossing wins)", () => {
		// Square with a triangular notch cut into the right side to (10,0).
		const notched: Point[] = [
			{ x: -40, y: -40 },
			{ x: 40, y: -40 },
			{ x: 10, y: 0 },
			{ x: 40, y: 40 },
			{ x: -40, y: 40 },
		];
		const result = calcOutlinePointTowardForPolygon(notched, baseFrame, {
			x: 200,
			y: 0,
		});
		expect(result!.x).toBeCloseTo(10);
		expect(result!.y).toBeCloseTo(0);
	});
});
