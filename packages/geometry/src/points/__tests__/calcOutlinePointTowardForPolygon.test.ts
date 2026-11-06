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
	describe("under rotation and flips, with an off-origin center", () => {
		// Width 100 / height 60, apex at local (50, 0): flips are visible on it.
		const rightArrow: Point[] = [
			{ x: -50, y: -30 },
			{ x: 50, y: 0 },
			{ x: -50, y: 30 },
		];
		// Same box, apex at local (0, -30).
		const upArrow: Point[] = [
			{ x: -50, y: 30 },
			{ x: 0, y: -30 },
			{ x: 50, y: 30 },
		];
		const square: Point[] = [
			{ x: -50, y: -50 },
			{ x: 50, y: -50 },
			{ x: 50, y: 50 },
			{ x: -50, y: 50 },
		];
		const center = { cx: 300, cy: -200 };

		it("lands on a corner of a square rotated 45 degrees", () => {
			const result = calcOutlinePointTowardForPolygon(
				square,
				{ ...baseFrame, ...center, width: 100, height: 100, rotation: 45 },
				{ x: center.cx + 500, y: center.cy },
			);
			expect(result!.x).toBeCloseTo(center.cx + 50 * Math.SQRT2);
			expect(result!.y).toBeCloseTo(center.cy);
		});

		it("follows scaleX = -1: the apex points left", () => {
			const frame = { ...baseFrame, ...center, scaleX: -1 as const };
			const apex = calcOutlinePointTowardForPolygon(rightArrow, frame, {
				x: center.cx - 500,
				y: center.cy,
			});
			expect(apex!.x).toBeCloseTo(center.cx - 50);
			expect(apex!.y).toBeCloseTo(center.cy);
			const back = calcOutlinePointTowardForPolygon(rightArrow, frame, {
				x: center.cx + 500,
				y: center.cy,
			});
			expect(back!.x).toBeCloseTo(center.cx + 50);
			expect(back!.y).toBeCloseTo(center.cy);
		});

		it("follows scaleY = -1: the apex points down", () => {
			const frame = { ...baseFrame, ...center, scaleY: -1 as const };
			const apex = calcOutlinePointTowardForPolygon(upArrow, frame, {
				x: center.cx,
				y: center.cy + 500,
			});
			expect(apex!.x).toBeCloseTo(center.cx);
			expect(apex!.y).toBeCloseTo(center.cy + 30);
			const base = calcOutlinePointTowardForPolygon(upArrow, frame, {
				x: center.cx,
				y: center.cy - 500,
			});
			expect(base!.x).toBeCloseTo(center.cx);
			expect(base!.y).toBeCloseTo(center.cy - 30);
		});

		it("flips before rotating: scaleX = -1 then 90 degrees points the apex up", () => {
			// Local (50, 0) flips to (-50, 0), which a 90 degree turn takes to (0, -50).
			const frame = {
				...baseFrame,
				...center,
				rotation: 90,
				scaleX: -1 as const,
			};
			const apex = calcOutlinePointTowardForPolygon(rightArrow, frame, {
				x: center.cx,
				y: center.cy - 500,
			});
			expect(apex!.x).toBeCloseTo(center.cx);
			expect(apex!.y).toBeCloseTo(center.cy - 50);
			const back = calcOutlinePointTowardForPolygon(rightArrow, frame, {
				x: center.cx,
				y: center.cy + 500,
			});
			expect(back!.x).toBeCloseTo(center.cx);
			expect(back!.y).toBeCloseTo(center.cy + 50);
		});

		it("combines a 30 degree rotation with scaleY = -1", () => {
			// Local apex (0, -30) flips to (0, 30); turning that 30 degrees gives
			// (-30·sin 30°, 30·cos 30°) = (-15, 15√3).
			const apexOffset = { x: -15, y: 15 * Math.sqrt(3) };
			const result = calcOutlinePointTowardForPolygon(
				upArrow,
				{ ...baseFrame, ...center, rotation: 30, scaleY: -1 },
				{
					x: center.cx + 4 * apexOffset.x,
					y: center.cy + 4 * apexOffset.y,
				},
			);
			expect(result!.x).toBeCloseTo(center.cx + apexOffset.x);
			expect(result!.y).toBeCloseTo(center.cy + apexOffset.y);
		});
	});
});
