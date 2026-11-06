import { describe, it, expect } from "vitest";

import { calcBoundingBox } from "../../geometry/calcBoundingBox";
import { calcFrameCornerPoints } from "../../geometry/calcFrameCornerPoints";
import type { TransformedFrame } from "../../types/TransformedFrame";

/** Box of the frame's transformed corners, which the shortcut must reproduce. */
const calcCornerBoundingBox = (frame: TransformedFrame) => {
	const corners = calcFrameCornerPoints(frame);
	const xs = corners.map((corner) => corner.x);
	const ys = corners.map((corner) => corner.y);
	return {
		top: Math.min(...ys),
		left: Math.min(...xs),
		right: Math.max(...xs),
		bottom: Math.max(...ys),
	};
};

describe("calcBoundingBox", () => {
	it("derives the box straight from the center when unrotated", () => {
		const result = calcBoundingBox({
			cx: 100,
			cy: 50,
			width: 80,
			height: 40,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		});
		expect(result.left).toBeCloseTo(60);
		expect(result.right).toBeCloseTo(140);
		expect(result.top).toBeCloseTo(30);
		expect(result.bottom).toBeCloseTo(70);
	});

	it("handles an unrotated square centered on the origin", () => {
		const result = calcBoundingBox({
			cx: 0,
			cy: 0,
			width: 100,
			height: 100,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		});
		expect(result.left).toBeCloseTo(-50);
		expect(result.right).toBeCloseTo(50);
		expect(result.top).toBeCloseTo(-50);
		expect(result.bottom).toBeCloseTo(50);
	});

	it("computes the box of a rectangle rotated 90 degrees", () => {
		const result = calcBoundingBox({
			cx: 0,
			cy: 0,
			width: 100,
			height: 40,
			rotation: 90,
			scaleX: 1,
			scaleY: 1,
		});
		// A 90 degree rotation swaps width and height.
		expect(result.left).toBeCloseTo(-20);
		expect(result.right).toBeCloseTo(20);
		expect(result.top).toBeCloseTo(-50);
		expect(result.bottom).toBeCloseTo(50);
	});

	it("grows the box for a square rotated 45 degrees", () => {
		const size = 100;
		const result = calcBoundingBox({
			cx: 0,
			cy: 0,
			width: size,
			height: size,
			rotation: 45,
			scaleX: 1,
			scaleY: 1,
		});
		// The box of a square rotated 45 degrees has side size*sqrt(2).
		const expected = (size / 2) * Math.SQRT2;
		expect(result.left).toBeCloseTo(-expected);
		expect(result.right).toBeCloseTo(expected);
	});
	describe.each([30, 45, 90, 137.25, -61.8])(
		"rotated %s degrees",
		(rotation) => {
			it.each([
				[1, 1],
				[-1, 1],
				[1, -1],
				[-1, -1],
			] as const)(
				"matches the turned corners exactly with scaleX %s / scaleY %s",
				(scaleX, scaleY) => {
					const frame: TransformedFrame = {
						cx: 123.4,
						cy: -56.7,
						width: 180,
						height: 70,
						rotation,
						scaleX,
						scaleY,
					};
					expect(calcBoundingBox(frame)).toEqual(calcCornerBoundingBox(frame));
				},
			);
		},
	);

	it("encloses the same box for a negative width as for its magnitude", () => {
		const frame: TransformedFrame = {
			cx: 10,
			cy: 20,
			width: -80,
			height: 40,
			rotation: 30,
			scaleX: 1,
			scaleY: 1,
		};
		expect(calcBoundingBox(frame)).toEqual(calcCornerBoundingBox(frame));
		expect(calcBoundingBox(frame)).toEqual(
			calcBoundingBox({ ...frame, width: 80 }),
		);
	});

	it("turns every side NaN when a rotated frame's width is NaN", () => {
		expect(
			calcBoundingBox({
				cx: 0,
				cy: 0,
				width: NaN,
				height: 40,
				rotation: 30,
				scaleX: 1,
				scaleY: 1,
			}),
		).toEqual({ top: NaN, left: NaN, right: NaN, bottom: NaN });
	});
});
