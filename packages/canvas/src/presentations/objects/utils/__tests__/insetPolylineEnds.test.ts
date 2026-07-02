import { describe, it, expect } from "vitest";

import { insetPolylineEnds } from "../insetPolylineEnds";

describe("insetPolylineEnds", () => {
	it("returns the original point sequence as-is (a copy) when inset is 0", () => {
		const points = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		];
		const result = insetPolylineEnds(points, 0, 0);
		expect(result).toEqual(points);
		expect(result).not.toBe(points);
		expect(result[0]).not.toBe(points[0]);
	});

	it("returns as-is when there is one or zero points", () => {
		expect(insetPolylineEnds([{ x: 1, y: 2 }], 5, 5)).toEqual([{ x: 1, y: 2 }]);
		expect(insetPolylineEnds([], 5, 5)).toEqual([]);
	});

	it("startInset moves only the first point toward the second point", () => {
		const result = insetPolylineEnds(
			[
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			],
			9,
			0,
		);
		expect(result[0]).toEqual({ x: 9, y: 0 });
		expect(result[1]).toEqual({ x: 100, y: 0 });
	});

	it("endInset moves only the last point toward the second-to-last point", () => {
		const result = insetPolylineEnds(
			[
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			],
			0,
			18,
		);
		expect(result[0]).toEqual({ x: 0, y: 0 });
		expect(result[1]).toEqual({ x: 82, y: 0 });
	});

	it("applies correctly in a diagonal direction too", () => {
		// (0,0)-(30,40) has length 50. inset 9 → ratio 9/50
		const result = insetPolylineEnds(
			[
				{ x: 0, y: 0 },
				{ x: 30, y: 40 },
			],
			9,
			0,
		);
		expect(result[0].x).toBeCloseTo((30 * 9) / 50);
		expect(result[0].y).toBeCloseTo((40 * 9) / 50);
		expect(result[1]).toEqual({ x: 30, y: 40 });
	});

	it("clamps proportionally when the total inset exceeds the segment length for two points", () => {
		// length 12, inset 9 at both ends (total 18 > 12) → clamped to 6 each
		const result = insetPolylineEnds(
			[
				{ x: 0, y: 0 },
				{ x: 12, y: 0 },
			],
			9,
			9,
		);
		expect(result[0].x).toBeCloseTo(6);
		expect(result[1].x).toBeCloseTo(6);
	});

	it("for a multi-point polyline, shortens only the first and last segments, leaving intermediate points unchanged", () => {
		const result = insetPolylineEnds(
			[
				{ x: 0, y: 0 },
				{ x: 50, y: 0 },
				{ x: 100, y: 0 },
			],
			9,
			9,
		);
		expect(result[0]).toEqual({ x: 9, y: 0 });
		expect(result[1]).toEqual({ x: 50, y: 0 });
		expect(result[2]).toEqual({ x: 91, y: 0 });
	});

	it("stops at the segment end without flipping when inset exceeds the segment length (multi-point)", () => {
		// first segment length 5 < inset 9 → stops at the adjacent point
		const result = insetPolylineEnds(
			[
				{ x: 0, y: 0 },
				{ x: 5, y: 0 },
				{ x: 100, y: 0 },
			],
			9,
			0,
		);
		expect(result[0]).toEqual({ x: 5, y: 0 });
	});

	it("does not move on a zero-length segment", () => {
		const result = insetPolylineEnds(
			[
				{ x: 5, y: 5 },
				{ x: 5, y: 5 },
			],
			9,
			9,
		);
		expect(result[0]).toEqual({ x: 5, y: 5 });
		expect(result[1]).toEqual({ x: 5, y: 5 });
	});
});
