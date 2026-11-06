import type { Point, Rect } from "@jiscribe/geometry";

import { isSameCoordinate } from "./isSameCoordinate";
import { type LayoutAxis, createLayoutAxis } from "./LayoutAxis";
import type { LayoutDirection } from "./LayoutDirection";
import { toRowKey } from "./RowIndex";
import type { LayoutVisualMargin } from "./types";
import { growByVisualMargin, readVisualMargin } from "./visualMargin";

/** Preferred distance in px between two routes running side by side through one gap. */
export const GAP_LANE_SPACING = 16;

/** Room kept between a label on one lane and the route on the next, in px. */
const LABEL_LANE_MARGIN = 4;

/**
 * Least length in px of the stub between a box, or the visual margin it is drawn with,
 * and the first bend of a route leaving or entering it, or {@link LANE_STUB_RATIO} of
 * the rank spacing when that is more; a gap too narrow for its lanes and these stubs
 * is widened.
 */
export const LANE_STUB_LENGTH = 24;

/** Share of the rank spacing a stub takes at least, so wider spacing gives longer stubs. */
export const LANE_STUB_RATIO = 0.3;

/** A label a route carries: where dagre put it and how much of the rank axis it takes. */
export type GapLaneLabel = {
	point: Point;
	/** The label box's size along the rank axis (its height in a top-to-bottom flow). */
	alongExtent: number;
};

/** A node's box with the visual margin it is drawn with past its sides; see {@link spreadGapLanes}. */
export type GapLaneMarginBox = {
	/** The box itself, as the routes join it; moved in place with the boxes. */
	box: Rect;
	margin: LayoutVisualMargin;
};

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
	/** How much of the rank axis the label this run carries takes; 0 without one. */
	labelExtent: number;
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

/** Whether two runs' sideways extents come within a lane's width of each other. */
const overlapsSideways = (left: GapRun, right: GapRun): boolean =>
	Math.min(left.from, left.to) - GAP_LANE_SPACING <
		Math.max(right.from, right.to) &&
	Math.min(right.from, right.to) - GAP_LANE_SPACING <
		Math.max(left.from, left.to);

/**
 * Collect the runs of every path that cross a gap sideways. A run is two consecutive
 * points on one rank coordinate, which only a gap midline produces (see
 * calcOrthogonalPath); the path's ends themselves never start one.
 */
const collectGapRuns = (
	paths: readonly Point[][],
	direction: LayoutDirection,
	rankSpacing: number,
	labels: readonly (GapLaneLabel | undefined)[],
): GapRun[] => {
	const axis = createLayoutAxis(direction);
	const runs: GapRun[] = [];
	paths.forEach((path, pathIndex) => {
		const label = labels[pathIndex];
		for (let index = 1; index + 2 < path.length; index += 1) {
			const start = path[index];
			const end = path[index + 1];
			if (
				!isSameCoordinate(axis.along(start), axis.along(end)) ||
				isSameCoordinate(axis.across(start), axis.across(end))
			) {
				continue;
			}
			runs.push({
				path,
				index,
				from: axis.across(start),
				to: axis.across(end),
				before: axis.along(path[index - 1]),
				after: axis.along(path[index + 2]),
				along: axis.along(start),
				// The run through the label's own gap is the one that carries it.
				labelExtent:
					label !== undefined &&
					Math.abs(axis.along(start) - axis.along(label.point)) <
						rankSpacing / 2
						? label.alongExtent
						: 0,
			});
		}
	});
	return runs;
};

/** A visual margin reaching past one side of a box along the rank axis, where a gap may face it. */
type FacingMargin = {
	/** Rank-axis coordinate of the box's side the margin reaches past. */
	side: number;
	/** How far the margin reaches past that side, more than 0. */
	reach: number;
	/** Where the box grown by its whole margin starts across the rank axis. */
	acrossFrom: number;
	/** Where the box grown by its whole margin ends across the rank axis. */
	acrossTo: number;
};

/**
 * The visual margins along the rank axis, the ones reaching past a box's ahead side
 * and the ones reaching past its behind side, each sorted by the side's coordinate,
 * with the farthest reach of each kind: what lets a gap find the margins facing it
 * without going through every box (see calcNearestMarginDistance).
 */
type FacingMarginIndex = {
	ahead: FacingMargin[];
	behind: FacingMargin[];
	maxAheadReach: number;
	maxBehindReach: number;
};

const indexFacingMargins = (
	marginBoxes: readonly GapLaneMarginBox[],
	axis: LayoutAxis,
): FacingMarginIndex => {
	const index: FacingMarginIndex = {
		ahead: [],
		behind: [],
		maxAheadReach: 0,
		maxBehindReach: 0,
	};
	for (const { box, margin } of marginBoxes) {
		const grown = growByVisualMargin(box, margin);
		const acrossFrom = axis.acrossStart(grown);
		const acrossTo = acrossFrom + axis.acrossExtent(grown);
		const boxStart = axis.alongStart(box);
		const aheadReach = readVisualMargin(margin, axis.aheadSide);
		const behindReach = readVisualMargin(margin, axis.behindSide);
		if (aheadReach > 0) {
			index.ahead.push({
				side: boxStart + axis.alongExtent(box),
				reach: aheadReach,
				acrossFrom,
				acrossTo,
			});
			index.maxAheadReach = Math.max(index.maxAheadReach, aheadReach);
		}
		if (behindReach > 0) {
			index.behind.push({
				side: boxStart,
				reach: behindReach,
				acrossFrom,
				acrossTo,
			});
			index.maxBehindReach = Math.max(index.maxBehindReach, behindReach);
		}
	}
	index.ahead.sort((left, right) => left.side - right.side);
	index.behind.sort((left, right) => left.side - right.side);
	return index;
};

/**
 * Index into `margins` (sorted by side) of the first whose side lies past `along`, or
 * at it as well when `includesAlong`; `margins.length` when there is none.
 */
const findFirstMarginIndexPast = (
	margins: readonly FacingMargin[],
	along: number,
	includesAlong: boolean,
): number => {
	let low = 0;
	let high = margins.length;
	while (low < high) {
		const middle = (low + high) >> 1;
		const side = margins[middle].side;
		if (side < along || (!includesAlong && side === along)) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}
	return low;
};

/**
 * How near a gap's midline the nearest visual margin facing it over one of its runs
 * ends, along the rank axis, or `limit` when none is nearer: a margin is kept clear of
 * as a box is, from wherever it reaches past the side toward the gap. A side with no
 * margin adds nothing, the box itself being measured from the runs' own ends. The
 * margins are visited nearest side first, and the visit stops once no farther side's
 * margin could come within `limit`.
 */
const calcNearestMarginDistance = (
	along: number,
	runs: readonly GapRun[],
	limit: number,
	index: FacingMarginIndex,
): number => {
	const isOverRun = ({ acrossFrom, acrossTo }: FacingMargin): boolean =>
		runs.some(
			(run) =>
				Math.min(run.from, run.to) < acrossTo &&
				acrossFrom < Math.max(run.from, run.to),
		);
	let nearest = limit;
	// Boxes ending at or before the midline, the margins past their ahead side.
	for (
		let position = findFirstMarginIndexPast(index.ahead, along, false) - 1;
		position >= 0;
		position -= 1
	) {
		const margin = index.ahead[position];
		if (along - margin.side - index.maxAheadReach >= nearest) {
			break;
		}
		if (isOverRun(margin)) {
			nearest = Math.min(nearest, along - (margin.side + margin.reach));
		}
	}
	// Boxes starting at or after the midline, the margins past their behind side.
	for (
		let position = findFirstMarginIndexPast(index.behind, along, true);
		position < index.behind.length;
		position += 1
	) {
		const margin = index.behind[position];
		if (margin.side - index.maxBehindReach - along >= nearest) {
			break;
		}
		if (isOverRun(margin)) {
			nearest = Math.min(nearest, margin.side - margin.reach - along);
		}
	}
	return nearest;
};

/**
 * Spread the routes that cross one gap sideways over lanes, so two of them never share
 * a line where they overlap: runs clear of each other sideways keep the gap's midline,
 * and the lanes are ordered to keep crossings few. A gap too narrow for its lanes is
 * widened, moving the ranks beyond it. Mutates the paths and boxes in place.
 *
 * @param paths - Full routes, each from the point on the source box to the point on the
 *   target box, as calcOrthogonalPath builds them; only the points of a sideways run
 *   are moved, and only along the rank axis
 * @param direction - Decides which axis is the rank axis
 * @param rankSpacing - Width of a gap in px; lanes stay inside it, closer than
 *   {@link GAP_LANE_SPACING} when there are too many for the gap
 * @param labels - The label each path carries, by the same index as `paths`, or
 *   undefined; a lane whose run carries one is kept clear of its neighbours by the
 *   label's extent along the rank axis, and its point moves with the ranks
 * @param boxes - The boxes the routes join, mutated: a gap too narrow for its lanes
 *   with {@link LANE_STUB_LENGTH} on either side is widened, and every box and point
 *   beyond it moves along the rank axis by the same amount
 * @param marginBoxes - The boxes drawn past their sides, each one of `boxes` itself
 *   with its margin: the lanes and their stubs keep clear of a margin facing the gap
 *   over one of its runs as they do of the runs' own boxes, so a route leaving through
 *   its own node's margin bends only beyond it
 */
export const spreadGapLanes = (
	paths: readonly Point[][],
	direction: LayoutDirection,
	rankSpacing: number,
	labels: readonly (GapLaneLabel | undefined)[] = [],
	boxes: Rect[] = [],
	marginBoxes: readonly GapLaneMarginBox[] = [],
): void => {
	const axis = createLayoutAxis(direction);
	const marginIndex =
		marginBoxes.length === 0
			? undefined
			: indexFacingMargins(marginBoxes, axis);
	const runsByGap = new Map<number, GapRun[]>();
	for (const run of collectGapRuns(paths, direction, rankSpacing, labels)) {
		const key = toRowKey(run.along);
		const runs = runsByGap.get(key);
		if (runs === undefined) {
			runsByGap.set(key, [run]);
		} else {
			runs.push(run);
		}
	}
	// Each gap's lanes, with how much wider than it is the gap has to be for them.
	type GapPlan = {
		along: number;
		laneOf: Map<GapRun, number>;
		offsets: number[];
		widening: number;
	};
	const plans: GapPlan[] = [];
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
		// Runs that never come within a lane's width of each other sideways can share a
		// lane; a run goes below every earlier run it would otherwise touch.
		const laneOf = new Map<GapRun, number>();
		for (const run of ordered) {
			let lane = 0;
			for (const [placed, placedLane] of laneOf) {
				if (overlapsSideways(run, placed)) {
					lane = Math.max(lane, placedLane + 1);
				}
			}
			laneOf.set(run, lane);
		}
		const laneCount = Math.max(...laneOf.values()) + 1;
		// A lane carrying a label pushes its neighbours away by the label's extent; the
		// whole stack is centred on the midline and shrunk when the gap cannot hold it.
		const extentOfLane = new Array<number>(laneCount).fill(0);
		for (const [run, laneIndex] of laneOf) {
			extentOfLane[laneIndex] = Math.max(
				extentOfLane[laneIndex],
				run.labelExtent,
			);
		}
		const offsets = [0];
		for (let laneIndex = 1; laneIndex < laneCount; laneIndex += 1) {
			offsets.push(
				offsets[laneIndex - 1] +
					Math.max(
						GAP_LANE_SPACING,
						(extentOfLane[laneIndex - 1] + extentOfLane[laneIndex]) / 2 +
							LABEL_LANE_MARGIN,
					),
			);
		}
		const span = offsets[offsets.length - 1];
		// The gap is as wide as the nearest rank boundary on either side of the midline
		// says (a label dagre reserved room for widens it beyond rankSpacing), a visual
		// margin reaching into it included; the stack has to leave a stub's length clear
		// of both boundaries, or the gap grows.
		const halfGapToEnds = Math.min(
			...ordered.map((run) =>
				Math.min(
					Math.abs(run.before - run.along),
					Math.abs(run.after - run.along),
				),
			),
		);
		const halfGap =
			marginIndex === undefined
				? halfGapToEnds
				: calcNearestMarginDistance(
						runs[0].along,
						runs,
						halfGapToEnds,
						marginIndex,
					);
		const stub = Math.max(LANE_STUB_LENGTH, rankSpacing * LANE_STUB_RATIO);
		const room = 2 * halfGap - 2 * stub;
		plans.push({
			along: runs[0].along,
			laneOf,
			offsets,
			widening: Math.max(0, span - room),
		});
	}

	// Widen the gaps that need it, from the first rank on: everything beyond a gap's
	// midline moves by what that gap grew, and the moves add up along the ranks.
	const widenings = plans
		.filter(({ widening }) => widening > 0)
		.sort((a, b) => a.along - b.along);
	// Running totals over the widenings, so a coordinate's shift is one scan of the
	// few gaps that grew rather than a filter over them per point.
	const cumulative = widenings.reduce<number[]>((sums, plan) => {
		sums.push((sums[sums.length - 1] ?? 0) + plan.widening);
		return sums;
	}, []);
	const sumWhere = (keeps: (planAlong: number) => boolean): number => {
		let total = 0;
		for (let index = 0; index < widenings.length; index += 1) {
			if (!keeps(widenings[index].along)) {
				break;
			}
			total = cumulative[index];
		}
		return total;
	};
	const shiftBeyond = (along: number): number =>
		sumWhere((planAlong) => planAlong < along);
	const shiftedBefore = (along: number): number =>
		sumWhere((planAlong) => planAlong <= along);
	if (widenings.length > 0) {
		const pointsToMove = new Set<Point>();
		for (const path of paths) {
			for (const point of path) {
				pointsToMove.add(point);
			}
		}
		for (const label of labels) {
			if (label !== undefined) {
				pointsToMove.add(label.point);
			}
		}
		const deltaByPoint = new Map<Point, number>();
		for (const point of pointsToMove) {
			deltaByPoint.set(point, shiftBeyond(axis.along(point)));
		}
		for (const [point, delta] of deltaByPoint) {
			axis.shiftAlong(point, delta);
		}
		// A box beyond a gap moves whole; one spanning it (a container around ranks on both
		// sides) grows by the widening instead.
		for (const box of boxes) {
			const start = axis.alongStart(box);
			const startDelta = shiftBeyond(start);
			const endDelta = shiftBeyond(start + axis.alongExtent(box));
			axis.shiftBoxAlong(box, startDelta, endDelta - startDelta);
		}
	}

	for (const { along, laneOf, offsets, widening } of plans) {
		// The midline sits half the widening further on than it did, after every
		// earlier widening has moved it on as well.
		const midline = along + shiftedBefore(along) - widening / 2;
		const span = offsets[offsets.length - 1];
		for (const [run, laneIndex] of laneOf) {
			const lane = midline + offsets[laneIndex] - span / 2;
			for (const point of [run.path[run.index], run.path[run.index + 1]]) {
				axis.setAlong(point, lane);
			}
		}
	}
};
