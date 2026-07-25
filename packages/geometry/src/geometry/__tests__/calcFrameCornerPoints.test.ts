import { describe, it, expect } from "vitest";

import { degreesToRadians } from "../../common/degreesToRadians";
import { calcFrameCornerPoints } from "../../geometry/calcFrameCornerPoints";
import { calcAffineTransformedPoint } from "../../transform/calcAffineTransformedPoint";
import type { TransformedFrame } from "../../types";

/**
 * Oracle reproducing the pre-refactor implementation, which transformed each
 * corner separately via calcAffineTransformedPoint. Used as the reference for
 * checking that the semantics did not change.
 */
const cornersByReference = (frame: TransformedFrame) => {
	const { cx, cy, width, height, rotation = 0, scaleX = 1, scaleY = 1 } = frame;
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const radians = degreesToRadians(rotation);
	return [
		{ x: -halfWidth, y: -halfHeight },
		{ x: halfWidth, y: -halfHeight },
		{ x: halfWidth, y: halfHeight },
		{ x: -halfWidth, y: halfHeight },
	].map((corner) =>
		calcAffineTransformedPoint(
			corner.x,
			corner.y,
			scaleX,
			scaleY,
			radians,
			cx,
			cy,
		),
	);
};

describe("calcFrameCornerPoints", () => {
	it("returns axis-aligned corners clockwise from the top-left when rotation is 0", () => {
		const corners = calcFrameCornerPoints({
			cx: 100,
			cy: 100,
			width: 100,
			height: 50,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		});
		expect(corners).toEqual([
			{ x: 50, y: 75 },
			{ x: 150, y: 75 },
			{ x: 150, y: 125 },
			{ x: 50, y: 125 },
		]);
	});

	it("returns rotated coordinates when rotation is 90", () => {
		const corners = calcFrameCornerPoints({
			cx: 100,
			cy: 100,
			width: 100,
			height: 50,
			rotation: 90,
			scaleX: 1,
			scaleY: 1,
		});
		// The top-left (-50,-25) rotates to (cx+25, cy-50).
		expect(corners[0].x).toBeCloseTo(125);
		expect(corners[0].y).toBeCloseTo(50);
		expect(corners[2].x).toBeCloseTo(75);
		expect(corners[2].y).toBeCloseTo(150);
	});

	it("applies scaleX and scaleY to every corner", () => {
		// Regression guard for general (non ±1) scale math. The type is FlipScale but the
		// implementation still handles general scale, so out-of-domain values are cast in.
		const corners = calcFrameCornerPoints({
			cx: 0,
			cy: 0,
			width: 100,
			height: 50,
			rotation: 0,
			scaleX: 2,
			scaleY: -1,
		} as unknown as TransformedFrame);
		// top-left (-50,-25) -> (-100, 25)
		expect(corners[0]).toEqual({ x: -100, y: 25 });
		// top-right (50,-25) -> (100, 25)
		expect(corners[1]).toEqual({ x: 100, y: 25 });
		// bottom-right (50,25) -> (100, -25)
		expect(corners[2]).toEqual({ x: 100, y: -25 });
		// bottom-left (-50,25) -> (-100, -25)
		expect(corners[3]).toEqual({ x: -100, y: -25 });
	});

	it("falls back to rotation 0 and scale 1 when they are omitted", () => {
		const corners = calcFrameCornerPoints({
			cx: 100,
			cy: 100,
			width: 100,
			height: 50,
		} as TransformedFrame);
		// Axis-aligned corners for rotation 0 and scaleX = scaleY = 1.
		expect(corners).toEqual([
			{ x: 50, y: 75 },
			{ x: 150, y: 75 },
			{ x: 150, y: 125 },
			{ x: 50, y: 125 },
		]);
	});

	it("matches the per-corner affine transform for every corner when only rotated", () => {
		const frame: TransformedFrame = {
			cx: 100,
			cy: 100,
			width: 100,
			height: 50,
			rotation: 30,
			scaleX: 1,
			scaleY: 1,
		};
		const corners = calcFrameCornerPoints(frame);
		const reference = cornersByReference(frame);
		corners.forEach((corner, index) => {
			expect(corner.x).toBeCloseTo(reference[index].x);
			expect(corner.y).toBeCloseTo(reference[index].y);
		});
	});

	it("matches the per-corner affine transform for every corner under rotation and scale", () => {
		// Regression cases combining rotation with non-unit scale (flips included).
		// Out-of-domain FlipScale values are cast in to exercise the general scale math.
		const cases = [
			{
				cx: 10,
				cy: 20,
				width: 80,
				height: 40,
				rotation: 45,
				scaleX: 2,
				scaleY: 3,
			},
			{
				cx: -30,
				cy: 15,
				width: 120,
				height: 60,
				rotation: 135,
				scaleX: -1,
				scaleY: 1,
			},
			{
				cx: 0,
				cy: 0,
				width: 50,
				height: 200,
				rotation: -60,
				scaleX: 1,
				scaleY: -2,
			},
			{
				cx: 5,
				cy: -5,
				width: 100,
				height: 100,
				rotation: 200,
				scaleX: -1,
				scaleY: -1,
			},
		] as TransformedFrame[];
		for (const frame of cases) {
			const corners = calcFrameCornerPoints(frame);
			const reference = cornersByReference(frame);
			corners.forEach((corner, index) => {
				expect(corner.x).toBeCloseTo(reference[index].x);
				expect(corner.y).toBeCloseTo(reference[index].y);
			});
		}
	});
});
