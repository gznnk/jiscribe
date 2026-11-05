import { castRayOnPolygon, isPointInPolygon } from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { EdgeAnchorSides, type EdgeAnchorSide } from "../../types/EndpointRef";
import {
	type EdgeAnchorOutlineShape,
	calcEdgeAnchorOutlineRange,
} from "../calcEdgeAnchorOutlineRange";
import { convertBoxRatioToAnchorRegionRatio } from "../convertEdgeAnchorRatio";
import {
	EDGE_LOCAL_DIRECTIONS,
	calcEdgeAnchorLocalOrigin,
	calcLocalAnchorRegion,
} from "../localAnchorRay";

const TOLERANCE = 1e-6;

/** The flowchart parallelogram's outline (PARALLELOGRAM_SKEW_RATIO = 0.22), centered. */
const calcParallelogramOutline = (width: number, height: number): Point[] => {
	const skew = width * 0.22;
	return [
		{ x: -width / 2 + skew, y: -height / 2 },
		{ x: width / 2, y: -height / 2 },
		{ x: width / 2 - skew, y: height / 2 },
		{ x: -width / 2, y: height / 2 },
	];
};

const shapeOf = (
	partial: Partial<EdgeAnchorOutlineShape>,
): EdgeAnchorOutlineShape => ({
	width: 200,
	height: 100,
	geometry: "rect",
	outline: undefined,
	anchorRegion: undefined,
	...partial,
});

/**
 * Whether the ray an edge anchor at the box ratio casts starts inside the outline
 * and leaves it, the way the canvas casts it (from the anchor region's center line).
 */
const leavesOutline = (
	shape: EdgeAnchorOutlineShape,
	side: EdgeAnchorSide,
	boxRatio: number,
): boolean => {
	const outline = shape.outline as Point[];
	const origin = calcEdgeAnchorLocalOrigin(
		calcLocalAnchorRegion(shape, shape.anchorRegion),
		{
			side,
			t: convertBoxRatioToAnchorRegionRatio(
				boxRatio,
				side,
				shape,
				shape.anchorRegion,
			),
		},
	);
	const direction = EDGE_LOCAL_DIRECTIONS[side];
	return (
		isPointInPolygon(origin, outline) &&
		castRayOnPolygon(outline, origin.x, origin.y, direction.x, direction.y) !==
			null
	);
};

/** Both ends of the range, a tolerance inside, cast a ray that leaves the outline. */
const expectEndsOnOutline = (
	shape: EdgeAnchorOutlineShape,
	side: EdgeAnchorSide,
): void => {
	const { min, max } = calcEdgeAnchorOutlineRange(shape, side);
	expect(leavesOutline(shape, side, min + TOLERANCE)).toBe(true);
	expect(leavesOutline(shape, side, max - TOLERANCE)).toBe(true);
};

describe("calcEdgeAnchorOutlineRange", () => {
	const parallelogram = shapeOf({
		outline: calcParallelogramOutline(200, 100),
	});

	it("keeps a parallelogram's top and bottom to where the slanted sides cross the center line", () => {
		for (const side of ["top", "bottom"] as const) {
			const range = calcEdgeAnchorOutlineRange(parallelogram, side);
			expect(range.min).toBeCloseTo(0.11, 6);
			expect(range.max).toBeCloseTo(0.89, 6);
			expectEndsOnOutline(parallelogram, side);
		}
		// Just past either end, the ray starts outside and would meet a slanted side from without.
		expect(leavesOutline(parallelogram, "bottom", 0.05)).toBe(false);
		expect(leavesOutline(parallelogram, "bottom", 0.95)).toBe(false);
		// A ray leaving through the right slanted side, not the bottom, still counts.
		expect(leavesOutline(parallelogram, "bottom", 0.8)).toBe(true);
	});

	it("leaves a parallelogram's left and right sides whole", () => {
		for (const side of ["left", "right"] as const) {
			const range = calcEdgeAnchorOutlineRange(parallelogram, side);
			expect(range.min).toBeCloseTo(0, 6);
			expect(range.max).toBeCloseTo(1, 6);
			expectEndsOnOutline(parallelogram, side);
		}
	});

	it("leaves every side of a rectangle whole, with or without its outline declared", () => {
		const rectangle: Point[] = [
			{ x: -100, y: -50 },
			{ x: 100, y: -50 },
			{ x: 100, y: 50 },
			{ x: -100, y: 50 },
		];
		for (const side of EdgeAnchorSides) {
			expect(calcEdgeAnchorOutlineRange(shapeOf({}), side)).toEqual({
				min: 0,
				max: 1,
			});
			const outlined = shapeOf({ outline: rectangle });
			const range = calcEdgeAnchorOutlineRange(outlined, side);
			expect(range.min).toBeCloseTo(0, 6);
			expect(range.max).toBeCloseTo(1, 6);
			expectEndsOnOutline(outlined, side);
		}
	});

	it("leaves every side of an ellipse whole", () => {
		for (const side of EdgeAnchorSides) {
			expect(
				calcEdgeAnchorOutlineRange(shapeOf({ geometry: "ellipse" }), side),
			).toEqual({ min: 0, max: 1 });
		}
	});

	it("keeps an ellipse's side to the chord a center line off its middle cuts", () => {
		// The anchor region's center line runs 25 px below the middle, half the
		// vertical radius: the chord there is sqrt(1 - 0.5²) of the width.
		const halfChordShare = Math.sqrt(1 - 0.5 * 0.5) / 2;
		const range = calcEdgeAnchorOutlineRange(
			shapeOf({
				geometry: "ellipse",
				anchorRegion: { x: -100, y: 0, width: 200, height: 50 },
			}),
			"top",
		);
		expect(range.min).toBeCloseTo(0.5 - halfChordShare, 9);
		expect(range.max).toBeCloseTo(0.5 + halfChordShare, 9);
	});

	it("answers the anchor region's stretch where the outline's does not meet it", () => {
		// The outline reaches 0..0.2 of the top along the center line, the region
		// spans 0.6..1 of it.
		const range = calcEdgeAnchorOutlineRange(
			shapeOf({
				outline: [
					{ x: -100, y: -50 },
					{ x: -60, y: -50 },
					{ x: -60, y: 50 },
					{ x: -100, y: 50 },
				],
				anchorRegion: { x: 20, y: -50, width: 80, height: 100 },
			}),
			"top",
		);
		expect(range.min).toBeCloseTo(0.6, 9);
		expect(range.max).toBeCloseTo(1, 9);
	});

	it("answers the whole side when there is nothing to measure", () => {
		// No extent along the side.
		expect(
			calcEdgeAnchorOutlineRange(
				shapeOf({ width: 0, outline: calcParallelogramOutline(0, 100) }),
				"top",
			),
		).toEqual({ min: 0, max: 1 });
		expect(
			calcEdgeAnchorOutlineRange(
				shapeOf({ width: NaN, outline: calcParallelogramOutline(200, 100) }),
				"top",
			),
		).toEqual({ min: 0, max: 1 });
		// An outline lying wholly above the center line: no ray starts inside it.
		expect(
			calcEdgeAnchorOutlineRange(
				shapeOf({
					outline: [
						{ x: -100, y: -50 },
						{ x: 100, y: -50 },
						{ x: 0, y: -10 },
					],
				}),
				"top",
			),
		).toEqual({ min: 0, max: 1 });
	});

	it("takes the stretch holding the midpoint where a concave outline splits the line", () => {
		// Two notches cut up into the bottom across the center line, at ratios
		// 0.05 .. 0.4 and 0.6 .. 0.65: the line is inside on 0..0.05, 0.4..0.6 and
		// 0.65..1, and the middle stretch wins though the last is longer.
		const notched = shapeOf({
			outline: [
				{ x: -100, y: -50 },
				{ x: 100, y: -50 },
				{ x: 100, y: 50 },
				{ x: 30, y: 50 },
				{ x: 30, y: -20 },
				{ x: 20, y: -20 },
				{ x: 20, y: 50 },
				{ x: -20, y: 50 },
				{ x: -20, y: -20 },
				{ x: -90, y: -20 },
				{ x: -90, y: 50 },
				{ x: -100, y: 50 },
			],
		});
		const range = calcEdgeAnchorOutlineRange(notched, "top");
		expect(range.min).toBeCloseTo(0.4, 6);
		expect(range.max).toBeCloseTo(0.6, 6);
		expectEndsOnOutline(notched, "top");
	});

	it("takes the longest stretch when none holds the midpoint", () => {
		// The notch straddles the middle (ratios 0.4 .. 0.55), leaving 0..0.4 and the
		// longer 0.55..1.
		const notched = shapeOf({
			outline: [
				{ x: -100, y: -50 },
				{ x: 100, y: -50 },
				{ x: 100, y: 50 },
				{ x: 10, y: 50 },
				{ x: 10, y: -20 },
				{ x: -20, y: -20 },
				{ x: -20, y: 50 },
				{ x: -100, y: 50 },
			],
		});
		const range = calcEdgeAnchorOutlineRange(notched, "top");
		expect(range.min).toBeCloseTo(0.55, 6);
		expect(range.max).toBeCloseTo(1, 6);
		expectEndsOnOutline(notched, "top");
	});

	it("keeps the range within the stretch an anchor region spans", () => {
		// A loop limit (cut = min(w, h) * 0.2 = 20): the corners are cut off the top and
		// the anchor region is the body below the cut.
		const loopLimit = shapeOf({
			outline: [
				{ x: -80, y: -50 },
				{ x: 80, y: -50 },
				{ x: 100, y: -30 },
				{ x: 100, y: 50 },
				{ x: -100, y: 50 },
				{ x: -100, y: -30 },
			],
			anchorRegion: { x: -100, y: -30, width: 200, height: 80 },
		});
		for (const side of ["left", "right"] as const) {
			const range = calcEdgeAnchorOutlineRange(loopLimit, side);
			expect(range.min).toBeCloseTo(0.2, 6);
			expect(range.max).toBeCloseTo(1, 6);
			expectEndsOnOutline(loopLimit, side);
			// Converted into the region's ratio, the range is the region's whole side.
			expect(
				convertBoxRatioToAnchorRegionRatio(
					range.min,
					side,
					loopLimit,
					loopLimit.anchorRegion,
				),
			).toBeCloseTo(0, 6);
		}
		// An off-page connector's body ends where its tip begins.
		const offPage = shapeOf({
			outline: [
				{ x: -100, y: -50 },
				{ x: 100, y: -50 },
				{ x: 100, y: 25 },
				{ x: 0, y: 50 },
				{ x: -100, y: 25 },
			],
			anchorRegion: { x: -100, y: -50, width: 200, height: 75 },
		});
		const right = calcEdgeAnchorOutlineRange(offPage, "right");
		expect(right.min).toBeCloseTo(0, 6);
		expect(right.max).toBeCloseTo(0.75, 6);
		expectEndsOnOutline(offPage, "right");
	});
});
