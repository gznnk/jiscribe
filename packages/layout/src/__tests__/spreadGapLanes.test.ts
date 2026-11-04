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
		const threeOverlapping = () => [
			routeThroughGap(0, 100),
			routeThroughGap(20, 120),
			routeThroughGap(40, 140),
		];
		const laneYs = (paths: ReturnType<typeof threeOverlapping>) =>
			paths.map((path) => path[1].y).sort((a, b) => a - b);

		// Boxes 40 either side of the midline leave 80 - 2 * 16 = 48 for the stack: the
		// preferred 16px steps fit.
		const roomy = threeOverlapping();
		for (const path of roomy) {
			path[0].y = 60;
			path[3].y = 140;
		}
		spreadGapLanes(roomy, "TB", 80);
		expect(laneYs(roomy)).toEqual([84, 100, 116]);

		// Boxes 20 either side leave 8: the same stack shrinks to fit.
		const tight = threeOverlapping();
		for (const path of tight) {
			path[0].y = 80;
			path[3].y = 120;
		}
		spreadGapLanes(tight, "TB", 40);
		expect(laneYs(tight)).toEqual([96, 100, 104]);
	});

	it("keeps runs that do not overlap sideways on the midline together", () => {
		const leftward = routeThroughGap(200, 0);
		const rightward = routeThroughGap(260, 500);

		spreadGapLanes([leftward, rightward], "TB", 80);

		expect(leftward[1].y).toBe(100);
		expect(rightward[1].y).toBe(100);
	});

	it("keeps a lane carrying a label clear of the next by the label's height", () => {
		const wide = routeThroughGap(0, 200);
		const narrow = routeThroughGap(100, 300);

		spreadGapLanes([wide, narrow], "TB", 80, [
			{ point: { x: 100, y: 100 }, alongExtent: 24 },
			undefined,
		]);

		// 24 / 2 + 4 = 16 either side of the label... the lanes sit 16px apart at
		// least, here (24 + 0) / 2 + 4 = 16 as well; with a taller label they part more.
		expect(Math.abs(wide[1].y - narrow[1].y)).toBe(16);

		const tall = routeThroughGap(0, 200);
		const other = routeThroughGap(100, 300);
		spreadGapLanes([tall, other], "TB", 80, [
			{ point: { x: 100, y: 100 }, alongExtent: 40 },
			undefined,
		]);
		expect(Math.abs(tall[1].y - other[1].y)).toBe(24);
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
