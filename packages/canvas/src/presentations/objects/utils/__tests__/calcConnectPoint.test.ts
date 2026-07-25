import type { Point, Rect, TransformedFrame } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import {
	calcConnectPoint,
	calcConnectPointDirection,
} from "../calcConnectPoint";

const baseFrame: TransformedFrame = {
	cx: 0,
	cy: 0,
	width: 100,
	height: 100,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

// Home-plate pentagon (tip 0.3): the vertical edges only span y = -50 … 20.
const homePlate: Point[] = [
	{ x: -50, y: -50 },
	{ x: 50, y: -50 },
	{ x: 50, y: 20 },
	{ x: 0, y: 50 },
	{ x: -50, y: 20 },
];

// The rectangular band above the tip, as ObjectAnchorRegionRegistry would report it.
const bodyBand: Rect = { x: -50, y: -50, width: 100, height: 70 };

describe("calcConnectPoint", () => {
	describe("with an outline", () => {
		it("centers the side anchors on the anchor region, not the bounding box", () => {
			expect(
				calcConnectPoint(baseFrame, "leftCenter", homePlate, bodyBand),
			).toEqual({ x: -50, y: -15 });
			expect(
				calcConnectPoint(baseFrame, "rightCenter", homePlate, bodyBand),
			).toEqual({ x: 50, y: -15 });
		});

		it("keeps the top / bottom anchors on the silhouette's extremes", () => {
			expect(
				calcConnectPoint(baseFrame, "topCenter", homePlate, bodyBand),
			).toEqual({ x: 0, y: -50 });
			// straight down from the region center lands on the tip
			expect(
				calcConnectPoint(baseFrame, "bottomCenter", homePlate, bodyBand),
			).toEqual({ x: 0, y: 50 });
		});

		it("falls back to the bounding-box center band without an anchor region", () => {
			expect(calcConnectPoint(baseFrame, "leftCenter", homePlate)).toEqual({
				x: -50,
				y: 0,
			});
		});

		it("follows rotation and flip", () => {
			const rotated = calcConnectPoint(
				{ ...baseFrame, rotation: 90 },
				"leftCenter",
				homePlate,
				bodyBand,
			);
			expect(rotated.x).toBeCloseTo(15);
			expect(rotated.y).toBeCloseTo(-50);

			expect(
				calcConnectPoint(
					{ ...baseFrame, scaleX: -1 },
					"leftCenter",
					homePlate,
					bodyBand,
				),
			).toEqual({ x: 50, y: -15 });
		});
	});

	describe("without an outline", () => {
		it("resolves the bounding-box edge midpoint, matching calcFrameKeyPoint", () => {
			const frame = { ...baseFrame, cx: 200, cy: 300, width: 100, height: 60 };

			expect(calcConnectPoint(frame, "leftCenter")).toEqual({
				x: 150,
				y: 300,
			});
			expect(calcConnectPoint(frame, "bottomCenter")).toEqual({
				x: 200,
				y: 330,
			});
		});

		it("still applies the anchor region on the axis the ray does not travel", () => {
			expect(calcConnectPoint(baseFrame, "leftCenter", null, bodyBand)).toEqual(
				{ x: -50, y: -15 },
			);
			// travelling vertically, so the region only shifts x (unchanged here)
			expect(calcConnectPoint(baseFrame, "topCenter", null, bodyBand)).toEqual({
				x: 0,
				y: -50,
			});
		});
	});
});

describe("calcConnectPointDirection", () => {
	it("returns the anchor's own outward normal", () => {
		expect(calcConnectPointDirection(baseFrame, "leftCenter")).toBe("left");
		expect(calcConnectPointDirection(baseFrame, "rightCenter")).toBe("right");
		expect(calcConnectPointDirection(baseFrame, "topCenter")).toBe("up");
		expect(calcConnectPointDirection(baseFrame, "bottomCenter")).toBe("down");
	});

	it("rotates with the shape", () => {
		const rotated = { ...baseFrame, rotation: 90 };
		expect(calcConnectPointDirection(rotated, "rightCenter")).toBe("down");
		expect(calcConnectPointDirection(rotated, "topCenter")).toBe("right");
	});

	it("mirrors with a flipped shape", () => {
		expect(
			calcConnectPointDirection({ ...baseFrame, scaleX: -1 }, "rightCenter"),
		).toBe("left");
		expect(
			calcConnectPointDirection({ ...baseFrame, scaleY: -1 }, "topCenter"),
		).toBe("down");
	});

	it("stays on the correct axis for a tall shape whose anchor region shifts the anchor", () => {
		// A "center → anchor" vector would tip onto the vertical axis here.
		const tall = { ...baseFrame, width: 40, height: 400 };
		expect(calcConnectPointDirection(tall, "leftCenter")).toBe("left");
	});
});
