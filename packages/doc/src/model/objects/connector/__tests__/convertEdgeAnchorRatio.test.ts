import { describe, expect, it } from "vitest";

import {
	calcAnchorRegionBodyRange,
	convertAnchorRegionRatioToBoxRatio,
	convertBoxRatioToAnchorRegionRatio,
} from "../convertEdgeAnchorRatio";

const box = { width: 200, height: 100 };
// The body below a 20 px cut, as a loop limit's anchor region.
const region = { x: -100, y: -30, width: 200, height: 80 };

describe("convertBoxRatioToAnchorRegionRatio", () => {
	it("measures the same point along the region's side", () => {
		// Box ratio 0.6 on the left side is y = 10, which is 40 / 80 down the region.
		expect(convertBoxRatioToAnchorRegionRatio(0.6, "left", box, region)).toBe(
			0.5,
		);
		// The region spans the whole top, so a top ratio is the same in both.
		expect(convertBoxRatioToAnchorRegionRatio(0.3, "top", box, region)).toBe(
			0.3,
		);
	});

	it("leaves the ratio alone without a region", () => {
		expect(
			convertBoxRatioToAnchorRegionRatio(0.6, "left", box, undefined),
		).toBe(0.6);
	});

	it("holds a point beyond the region to its nearer end", () => {
		expect(convertBoxRatioToAnchorRegionRatio(0.1, "left", box, region)).toBe(
			0,
		);
	});

	it("answers the midpoint for a region with no extent on the side", () => {
		expect(
			convertBoxRatioToAnchorRegionRatio(0.6, "left", box, {
				...region,
				height: 0,
			}),
		).toBe(0.5);
	});
});

describe("convertAnchorRegionRatioToBoxRatio", () => {
	it("undoes convertBoxRatioToAnchorRegionRatio", () => {
		expect(convertAnchorRegionRatioToBoxRatio(0.5, "left", box, region)).toBe(
			0.6,
		);
		expect(
			convertAnchorRegionRatioToBoxRatio(0.5, "left", box, undefined),
		).toBe(0.5);
	});
});

describe("calcAnchorRegionBodyRange", () => {
	it("answers the stretch of each side the anchor region covers", () => {
		const loopLimit = { ...box, anchorRegion: region };
		expect(calcAnchorRegionBodyRange(loopLimit, "left")).toEqual({
			min: 0.2,
			max: 1,
		});
		expect(calcAnchorRegionBodyRange(loopLimit, "top")).toEqual({
			min: 0,
			max: 1,
		});
	});

	it("holds a region reaching past the box to the box's side", () => {
		const overhanging = {
			...box,
			anchorRegion: { x: -150, y: -50, width: 200, height: 100 },
		};
		expect(calcAnchorRegionBodyRange(overhanging, "top")).toEqual({
			min: 0,
			max: 0.75,
		});
	});

	it("answers the whole side with no region, a region the canvas falls back from, or no extent", () => {
		for (const shape of [
			{ ...box, anchorRegion: undefined },
			{
				...box,
				anchorRegion: { x: Number.NaN, y: 0, width: 10, height: 10 },
			},
			{ ...box, width: 0, anchorRegion: { ...region, x: 0, width: 0 } },
		]) {
			expect(calcAnchorRegionBodyRange(shape, "top")).toEqual({
				min: 0,
				max: 1,
			});
		}
	});
});
