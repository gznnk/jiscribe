import { describe, expect, it } from "vitest";

import { distributeTableTrackSizes } from "../distributeTableTrackSizes";

const sumOf = (sizes: number[]): number =>
	sizes.reduce((total, size) => total + size, 0);

describe("distributeTableTrackSizes", () => {
	it("keeps each track's share of the total, pinning none above its floor", () => {
		expect(distributeTableTrackSizes([40, 80], [10, 10], 240)).toEqual([
			80, 160,
		]);
	});

	it("holds each track at a floor of its own, at the rest's expense", () => {
		// The first track's share would be 34.3; pinned at 50, it leaves 70 for the
		// second, whose own floor is lower.
		expect(distributeTableTrackSizes([100, 250], [50, 10], 120)).toEqual([
			50, 70,
		]);
	});

	it("pins the track one pass uncovers after pinning another", () => {
		// The middle share is 28.57 at first; once the last is pinned it is 21.
		expect(distributeTableTrackSizes([50, 30, 4], [24, 24, 24], 80)).toEqual([
			32, 24, 24,
		]);
	});

	it("builds the run at its floors when the total is below the floors summed", () => {
		expect(distributeTableTrackSizes([60, 60], [20, 30], 10)).toEqual([20, 30]);
	});

	it("hands the rounding residue to the largest unpinned track", () => {
		const sizes = distributeTableTrackSizes([10, 10, 10], [0, 0, 0], 100);

		expect(sumOf(sizes)).toBeCloseTo(100, 9);
		expect([...sizes].sort((left, right) => left - right)).toEqual([
			33.3333, 33.3333, 33.3334,
		]);
	});

	it("takes an overshooting residue no track's floor can absorb from several", () => {
		const sizes = distributeTableTrackSizes(
			[30, 30, 30, 30],
			[24, 24, 24, 24],
			96.0002,
		);

		for (const size of sizes) {
			expect(size).toBeGreaterThanOrEqual(24);
		}
		expect(sumOf(sizes)).toBeCloseTo(96.0002, 9);
	});

	it("splits evenly across tracks with no size to keep a share of", () => {
		expect(distributeTableTrackSizes([0, 0], [0, 0], 100)).toEqual([50, 50]);
	});

	it("returns nothing for no tracks", () => {
		expect(distributeTableTrackSizes([], [], 100)).toEqual([]);
	});
});
