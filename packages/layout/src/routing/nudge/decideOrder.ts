import type { Point } from "@jiscribe/geometry";

import {
	type NudgePass,
	type RouteSegment,
	type SegmentMember,
	acrossOf,
	alongOf,
	calcOverlap,
	listSegmentMembers,
} from "./routeSegments";
import { isSameCoordinate } from "../../shared/coordinate";

/** One end of a run: the point it arrives at, and the way on along its route. */
type RunEnd = {
	path: readonly Point[];
	/** The index into `path` of the point the run arrives at. */
	pointIndex: number;
	/** Which way along `path` the route goes on past that point: 1 forward, -1 back. */
	step: 1 | -1;
};

const isRouteEnd = ({ path, pointIndex, step }: RunEnd): boolean =>
	pointIndex + step < 0 || pointIndex + step >= path.length;

/** The side, -1 or 1 across the run, the route turns to at the run's end. */
const turnOf = (
	{ path, pointIndex, step }: RunEnd,
	isVertical: boolean,
): number =>
	Math.sign(
		acrossOf(path[pointIndex + step], isVertical) -
			acrossOf(path[pointIndex], isVertical),
	);

const nextRunEnd = ({ path, pointIndex, step }: RunEnd): RunEnd => ({
	path,
	pointIndex: pointIndex + step,
	step,
});

/**
 * Which side of b's run a's should lie on, as one end of the stretch they share
 * decides it (`direction` -1 for the low end, 1 for the high): the run that turns
 * first goes on the side it turns to, and two turning together toward one side are
 * followed on along the path they share until they part. 0 when it decides nothing,
 * for an end reached at a route's end.
 *
 * @param a - The end of a's run on that side of the shared stretch, at it or beyond
 * @param b - The same for b
 * @returns 1 for a on the high side, -1 for the low, 0 for no preference
 */
const judgeEnd = (
	a: RunEnd,
	b: RunEnd,
	isVertical: boolean,
	direction: number,
): number => {
	const alongA = alongOf(a.path[a.pointIndex], isVertical);
	const alongB = alongOf(b.path[b.pointIndex], isVertical);
	if (!isSameCoordinate(alongA, alongB)) {
		if ((alongA - alongB) * direction < 0) {
			return isRouteEnd(a) ? 0 : turnOf(a, isVertical);
		}
		return isRouteEnd(b) ? 0 : -turnOf(b, isVertical);
	}
	if (isRouteEnd(a) || isRouteEnd(b)) {
		return 0;
	}
	const turn = turnOf(a, isVertical);
	if (turn !== turnOf(b, isVertical)) {
		return turn;
	}
	// The one whose next run lies nearer this stretch turns inside the other.
	const onward = judgeEnd(nextRunEnd(a), nextRunEnd(b), !isVertical, turn);
	return onward === 0 ? 0 : -turn * onward * direction;
};

/**
 * The ends of a segment's run, the one at its `from` first. A merged segment (see
 * RouteSegment.members) is followed, at each end of its stretch, along the member that
 * reaches that end, the first of them on a tie.
 */
const listRunEnds = (
	segment: RouteSegment,
	{ routes, isVertical }: NudgePass,
): { low: RunEnd; high: RunEnd } => {
	const endsOf = ({
		routeIndex,
		segmentIndex,
	}: SegmentMember): { low: RunEnd; high: RunEnd } => {
		const { path } = routes[routeIndex];
		const start: RunEnd = { path, pointIndex: segmentIndex, step: -1 };
		const end: RunEnd = { path, pointIndex: segmentIndex + 1, step: 1 };
		return alongOf(path[start.pointIndex], isVertical) <
			alongOf(path[end.pointIndex], isVertical)
			? { low: start, high: end }
			: { low: end, high: start };
	};
	const members = listSegmentMembers(segment);
	const lowest = members.reduce((best, member) =>
		member.from < best.from ? member : best,
	);
	const highest = members.reduce((best, member) =>
		member.to > best.to ? member : best,
	);
	return { low: endsOf(lowest).low, high: endsOf(highest).high };
};

/**
 * The order two conflicting segments should take so their routes do not cross where
 * they run together (Wybrow, Marriott & Stuckey 2009): each end of the stretch they
 * share has its say (see judgeEnd), and the low end's wins when they disagree. Two
 * that only touch end to end are judged where they touch, by their turns alone.
 *
 * @returns 1 for a on the high side of b, -1 for the low, 0 for no preference
 */
export const decideOrder = (
	a: RouteSegment,
	b: RouteSegment,
	pass: NudgePass,
): number => {
	const { isVertical } = pass;
	const endsOfA = listRunEnds(a, pass);
	const endsOfB = listRunEnds(b, pass);
	const overlap = calcOverlap(a, b);
	if (!(overlap > 0) || isSameCoordinate(overlap, 0)) {
		const [endOfA, endOfB] =
			a.to < b.to ? [endsOfA.high, endsOfB.low] : [endsOfA.low, endsOfB.high];
		if (isRouteEnd(endOfA) || isRouteEnd(endOfB)) {
			return 0;
		}
		const turn = turnOf(endOfA, isVertical);
		return turn === turnOf(endOfB, isVertical) ? 0 : turn;
	}
	const atLow = judgeEnd(endsOfA.low, endsOfB.low, isVertical, -1);
	return atLow !== 0
		? atLow
		: judgeEnd(endsOfA.high, endsOfB.high, isVertical, 1);
};
