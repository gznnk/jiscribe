import { describe, it, expect } from "vitest";

import { dedupePoints } from "../dedupePoints";

describe("dedupePoints", () => {
	it("returns an empty array as-is for an empty array", () => {
		expect(dedupePoints([])).toEqual([]);
	});

	it("returns the single point (as a copy) when there is only one point", () => {
		const points = [{ x: 1, y: 2 }];
		const result = dedupePoints(points);
		expect(result).toEqual([{ x: 1, y: 2 }]);
		expect(result[0]).not.toBe(points[0]);
	});

	it("keeps a point sequence with no overlaps as-is", () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 50, y: 50 },
		];
		expect(dedupePoints(points)).toEqual(points);
	});

	it("collapses trivial waypoints coinciding with the endpoints back into a straight line", () => {
		// source(0,0) → wp(0,0) duplicate → wp(100,0)≒target → target(100,0)
		const points = [
			{ x: 0, y: 0 },
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 0 },
		];
		expect(dedupePoints(points)).toEqual([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		]);
	});

	it("collapses consecutive points within the threshold (0.5px) and keeps points beyond it", () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 0.4, y: 0 }, // distance 0.4 ≤ 0.5 → collapse
			{ x: 1, y: 0 }, // distance 1 > 0.5 from the previous (0,0) → keep
		];
		expect(dedupePoints(points)).toEqual([
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
		]);
	});

	it("keeps identical coordinates that recur after moving away, since only the previous point is compared", () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 0, y: 0 },
		];
		expect(dedupePoints(points)).toEqual(points);
	});

	it("does not mutate the input array or its elements", () => {
		const points = [
			{ x: 1, y: 1 },
			{ x: 2, y: 2 },
		];
		const snapshot = JSON.parse(JSON.stringify(points));
		const result = dedupePoints(points);
		expect(points).toEqual(snapshot);
		expect(result[0]).not.toBe(points[0]);
	});
});
