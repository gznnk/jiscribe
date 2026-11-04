import { describe, expect, it } from "vitest";

import { spreadGapLanes } from "../spreadGapLanes";

/** A route down from (fromX, 0) through the gap midline y = 100 to (toX, 200). */
const routeThroughGap = (fromX: number, toX: number) => [
	{ x: fromX, y: 0 },
	{ x: fromX, y: 100 },
	{ x: toX, y: 100 },
	{ x: toX, y: 200 },
];

describe("spreadGapLanes", () => {
	it("leaves a gap with one run alone", () => {
		const path = routeThroughGap(0, 300);

		spreadGapLanes([path], "TB", 80);

		expect(path.map(({ y }) => y)).toEqual([0, 100, 100, 200]);
	});

	it("puts two overlapping rightward runs on lanes so that neither crosses the other", () => {
		const wide = routeThroughGap(0, 200);
		const narrow = routeThroughGap(100, 300);

		spreadGapLanes([wide, narrow], "TB", 80);

		// narrow's drop at x=100 would cut wide's run if it lay above it, so narrow goes
		// on the upper lane; the two lanes sit 16px apart around the midline.
		expect(narrow[1].y).toBe(92);
		expect(wide[1].y).toBe(108);
		expect(wide[1].x).toBe(0);
		expect(wide[2]).toEqual({ x: 200, y: 108 });
	});

	it("packs lanes closer when the gap is too narrow for the preferred spacing", () => {
		const paths = [
			routeThroughGap(0, 10),
			routeThroughGap(20, 30),
			routeThroughGap(40, 50),
		];

		spreadGapLanes(paths, "TB", 20);

		const lanes = paths.map((path) => path[1].y).sort((a, b) => a - b);
		expect(lanes).toEqual([95, 100, 105]);
	});

	it("spreads along x for a left-to-right flow", () => {
		const toPath = (fromY: number, toY: number) => [
			{ x: 0, y: fromY },
			{ x: 100, y: fromY },
			{ x: 100, y: toY },
			{ x: 200, y: toY },
		];
		const paths = [toPath(0, 50), toPath(60, 120)];

		spreadGapLanes(paths, "LR", 80);

		expect(new Set(paths.map((path) => path[1].x)).size).toBe(2);
		expect(paths.every((path) => path[1].x === path[2].x)).toBe(true);
	});
});
