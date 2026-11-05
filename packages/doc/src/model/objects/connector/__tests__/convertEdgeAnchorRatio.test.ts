import { describe, expect, it } from "vitest";

import {
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
