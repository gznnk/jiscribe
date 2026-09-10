import type { Point } from "@jiscribe/geometry";
import { doSegmentsIntersect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { crossOutlinePoints } from "../buildCrossPoints";

/**
 * The plus is twelve vertices walked in order, and every one of them is some
 * combination of the two thirds. Swapping a pair, or reading an arm's thickness
 * off the wrong axis, still yields twelve points inside the box that stroke into
 * a bow tie — the shape stays plausible while its edges cross. So the vertices
 * are checked as a polygon rather than compared against a fixed list.
 */

/** The edges of the closed polygon, last vertex back to first included. */
const edgesOf = (points: readonly Point[]): Array<[Point, Point]> =>
	points.map((point, index) => [point, points[(index + 1) % points.length]]);

/**
 * Whether two edges cross anywhere other than the vertex neighbours share. Edges
 * meeting end to end are excluded by index, so a crossing is the only thing left
 * for `doSegmentsIntersect` to report.
 */
const findCrossingEdges = (points: readonly Point[]): string[] => {
	const edges = edgesOf(points);
	const crossings: string[] = [];
	for (let i = 0; i < edges.length; i++) {
		for (let j = i + 2; j < edges.length; j++) {
			if (i === 0 && j === edges.length - 1) {
				continue;
			}
			const [p1, p2] = edges[i];
			const [q1, q2] = edges[j];
			if (doSegmentsIntersect(p1, p2, q1, q2)) {
				crossings.push(`edge ${i} crosses edge ${j}`);
			}
		}
	}
	return crossings;
};

const SIZES: ReadonlyArray<[number, number]> = [
	[90, 90],
	[300, 60],
	[60, 300],
	[120, 90],
];

describe("crossOutlinePoints", () => {
	it("walks twelve vertices without the outline crossing itself", () => {
		for (const [width, height] of SIZES) {
			const points = crossOutlinePoints(-width / 2, -height / 2, width, height);
			expect(points).toHaveLength(12);
			expect(findCrossingEdges(points), `${width}x${height}`).toEqual([]);
		}
	});

	it("keeps every edge axis-aligned, so the arms meet at square corners", () => {
		for (const [width, height] of SIZES) {
			const points = crossOutlinePoints(-width / 2, -height / 2, width, height);
			for (const [from, to] of edgesOf(points)) {
				const isAxisAligned = from.x === to.x || from.y === to.y;
				expect(isAxisAligned, `${width}x${height} (${from.x},${from.y})`).toBe(
					true,
				);
			}
		}
	});

	it("takes each arm's thickness from its own axis", () => {
		// 300x60: the upright is 100 wide (width / 3) and the crossbar 20 tall
		// (height / 3). Reading either off the other axis leaves the upright
		// narrower than the crossbar is thick, and the arms invert.
		const points = crossOutlinePoints(-150, -30, 300, 60);
		const xs = [...new Set(points.map((point) => point.x))].sort(
			(a, b) => a - b,
		);
		const ys = [...new Set(points.map((point) => point.y))].sort(
			(a, b) => a - b,
		);
		expect(xs).toEqual([-150, -50, 50, 150]);
		expect(ys).toEqual([-30, -10, 10, 30]);
	});
});
