import { describe, expect, it } from "vitest";

import { snapLabelPositionToMidpoints } from "../snapLabelPositionToMidpoints";

/** An L-shaped path: 100 across, then 300 down (400 long). Midpoints at 0.125, 0.5 and 0.625. */
const ELBOW = [
	{ x: 0, y: 0 },
	{ x: 100, y: 0 },
	{ x: 100, y: 300 },
];

/** Two 10-long legs on one line (20 long): midpoints at 0.25, 0.5 and 0.75. */
const TWO_LEGS = [
	{ x: 0, y: 0 },
	{ x: 10, y: 0 },
	{ x: 20, y: 0 },
];

describe("snapLabelPositionToMidpoints", () => {
	it("pulls a position near the middle of the whole path onto it", () => {
		expect(
			snapLabelPositionToMidpoints({ position: 0.51, offset: 0 }, ELBOW, 8),
		).toEqual({ position: 0.5, offset: 0 });
	});

	it("pulls a position near the middle of one segment onto it", () => {
		expect(
			snapLabelPositionToMidpoints({ position: 0.13, offset: 0 }, ELBOW, 8),
		).toEqual({ position: 0.125, offset: 0 });
		expect(
			snapLabelPositionToMidpoints({ position: 0.64, offset: 0 }, ELBOW, 8),
		).toEqual({ position: 0.625, offset: 0 });
	});

	it("keeps the offset, so a label beside the line lines up beside the midpoint", () => {
		expect(
			snapLabelPositionToMidpoints({ position: 0.51, offset: 30 }, ELBOW, 8),
		).toEqual({ position: 0.5, offset: 30 });
	});

	it("measures the distance along the path, and leaves one exactly at the threshold alone", () => {
		// 256 long, so 7 and 8 units from the middle are exact ratios.
		const path = [
			{ x: 0, y: 0 },
			{ x: 256, y: 0 },
		];
		expect(
			snapLabelPositionToMidpoints(
				{ position: 0.5 + 7 / 256, offset: 0 },
				path,
				8,
			),
		).toEqual({ position: 0.5, offset: 0 });
		const atThreshold = { position: 0.5 + 8 / 256, offset: 0 };
		expect(snapLabelPositionToMidpoints(atThreshold, path, 8)).toBe(
			atThreshold,
		);
	});

	it("returns the placement itself when no midpoint is inside the threshold", () => {
		const placement = { position: 0.3, offset: 0 };
		expect(snapLabelPositionToMidpoints(placement, ELBOW, 8)).toBe(placement);
	});

	it("takes the nearest of several midpoints inside the threshold", () => {
		// 12 along: 2 from the middle (10), 3 from the second leg's (15).
		expect(
			snapLabelPositionToMidpoints({ position: 0.6, offset: 0 }, TWO_LEGS, 8),
		).toEqual({ position: 0.5, offset: 0 });
	});

	it("takes the one nearer the source on a tie", () => {
		// 7.5 along: 2.5 from both the first leg's middle (5) and the path's (10).
		expect(
			snapLabelPositionToMidpoints({ position: 0.375, offset: 0 }, TWO_LEGS, 8),
		).toEqual({ position: 0.25, offset: 0 });
		// 12.5 along: 2.5 from both the path's middle (10) and the second leg's (15).
		expect(
			snapLabelPositionToMidpoints({ position: 0.625, offset: 0 }, TWO_LEGS, 8),
		).toEqual({ position: 0.5, offset: 0 });
	});

	it("gives a zero-length segment no midpoint of its own", () => {
		const path = [
			{ x: 0, y: 0 },
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		];
		const nearStart = { position: 0.02, offset: 0 };
		expect(snapLabelPositionToMidpoints(nearStart, path, 8)).toBe(nearStart);
	});

	it("returns the placement itself for a path with no length", () => {
		const placement = { position: 0.5, offset: 0 };
		expect(
			snapLabelPositionToMidpoints(
				placement,
				[
					{ x: 5, y: 5 },
					{ x: 5, y: 5 },
				],
				8,
			),
		).toBe(placement);
		expect(snapLabelPositionToMidpoints(placement, [], 8)).toBe(placement);
	});
});
