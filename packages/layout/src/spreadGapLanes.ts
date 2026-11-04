import type { Point } from "@jiscribe/geometry";

import { type LayoutDirection, isVerticalFlow } from "./LayoutDirection";

/** Preferred distance in px between two routes running side by side through one gap. */
export const GAP_LANE_SPACING = 16;

/** One horizontal run of a route through a gap between two ranks, in rank-axis terms. */
type GapRun = {
	path: Point[];
	/** Index into `path` of the run's first point; the run is that point and the next. */
	index: number;
	/** Across-axis coordinates of the run's two ends, in path order. */
	from: number;
	to: number;
	/** Rank-axis coordinate the route came from before the run, and goes to after it. */
	before: number;
	after: number;
	/** Rank-axis coordinate of the gap's midline, which the run sits on until spread. */
	along: number;
};

/** Number of crossings between `upper`'s route and `lower`'s when `upper` takes the lane nearer the smaller rank coordinate. */
const countPairCrossings = (upper: GapRun, lower: GapRun): number => {
	const lanes = { upper: upper.along - 1, lower: upper.along + 1 };
	const crossesRun = (
		verticalAcross: number,
		verticalFrom: number,
		verticalTo: number,
		run: GapRun,
		runLane: number,
	): boolean =>
		Math.min(run.from, run.to) < verticalAcross &&
		verticalAcross < Math.max(run.from, run.to) &&
		Math.min(verticalFrom, verticalTo) < runLane &&
		runLane < Math.max(verticalFrom, verticalTo);
	let crossings = 0;
	for (const [run, lane, other, otherLane] of [
		[upper, lanes.upper, lower, lanes.lower],
		[lower, lanes.lower, upper, lanes.upper],
	] as const) {
		if (crossesRun(run.from, run.before, lane, other, otherLane)) {
			crossings += 1;
		}
		if (crossesRun(run.to, lane, run.after, other, otherLane)) {
			crossings += 1;
		}
	}
	return crossings;
};

/**
 * Collect the runs of every path that cross a gap sideways. A run is two consecutive
 * points on one rank coordinate, which only a gap midline produces (see
 * calcOrthogonalCorners); the path's ends themselves never start one.
 */
const collectGapRuns = (
	paths: readonly Point[][],
	direction: LayoutDirection,
): GapRun[] => {
	const vertical = isVerticalFlow(direction);
	const along = (point: Point): number => (vertical ? point.y : point.x);
	const across = (point: Point): number => (vertical ? point.x : point.y);
	const runs: GapRun[] = [];
	for (const path of paths) {
		for (let index = 1; index + 2 < path.length; index += 1) {
			const start = path[index];
			const end = path[index + 1];
			if (along(start) !== along(end) || across(start) === across(end)) {
				continue;
			}
			runs.push({
				path,
				index,
				from: across(start),
				to: across(end),
				before: along(path[index - 1]),
				after: along(path[index + 2]),
				along: along(start),
			});
		}
	}
	return runs;
};

/**
 * Give the routes that cross one gap sideways a lane each, so two of them never share
 * a line, ordering the lanes to keep crossings few. Mutates the paths in place.
 *
 * @param paths - Full routes, each from the point on the source box to the point on the
 *   target box, as calcOrthogonalCorners builds them; only the points of a sideways run
 *   are moved, and only along the rank axis
 * @param direction - Decides which axis is the rank axis
 * @param rankSpacing - Width of a gap in px; lanes stay inside it, closer than
 *   {@link GAP_LANE_SPACING} when there are too many for the gap
 */
export const spreadGapLanes = (
	paths: readonly Point[][],
	direction: LayoutDirection,
	rankSpacing: number,
): void => {
	const vertical = isVerticalFlow(direction);
	const runsByGap = new Map<number, GapRun[]>();
	for (const run of collectGapRuns(paths, direction)) {
		// Gap midlines come out of one subtraction each, so equal gaps compare equal to
		// well under a thousandth of a pixel.
		const key = Math.round(run.along * 1000);
		runsByGap.set(key, [...(runsByGap.get(key) ?? []), run]);
	}
	for (const runs of runsByGap.values()) {
		if (runs.length < 2) {
			continue;
		}
		// A pairwise preference rather than a global optimum: with the lanes relative, the
		// order of two runs decides their crossings between themselves alone.
		const ordered = [...runs].sort(
			(left, right) =>
				countPairCrossings(left, right) - countPairCrossings(right, left) ||
				left.from - right.from,
		);
		const step = Math.min(GAP_LANE_SPACING, rankSpacing / (ordered.length + 1));
		ordered.forEach((run, position) => {
			const lane = run.along + (position - (ordered.length - 1) / 2) * step;
			for (const point of [run.path[run.index], run.path[run.index + 1]]) {
				if (vertical) {
					point.y = lane;
				} else {
					point.x = lane;
				}
			}
		});
	}
};
