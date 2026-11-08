import {
	type BoundingBox,
	doSegmentsIntersectByCoords,
	type Point,
} from "@jiscribe/geometry";

import { ceilCoordinate } from "./ceilCoordinate";
import { EDGE_END_SPACING } from "./chooseEdgeAnchors";
import { floorCoordinate } from "./floorCoordinate";
import { isSameCoordinate } from "./isSameCoordinate";
import {
	type SeparationConstraint,
	type SeparationVariable,
	solveSeparation,
} from "./solveSeparation";
import { GAP_LANE_SPACING } from "./spreadGapLanes";

/**
 * The narrowest spacing in px a group of runs is squeezed to in a tight channel; a
 * conflict that keeps its group from fitting even at this is kept as it stands.
 */
const LEAST_LANE_SPACING = 2;

/**
 * How far apart in px two segments may stand for the pair scan to look at them: the
 * widest gap either a lane or an end pair keeps.
 */
const PAIR_SCAN_SPACING = Math.max(GAP_LANE_SPACING, EDGE_END_SPACING);

/**
 * How near in px a run moved sideways, or the piece the move adds to a neighbour, may
 * come to a box or border side, unless it already ran nearer.
 */
const WALL_CLEARANCE = GAP_LANE_SPACING / 2;

/**
 * The gap in px two parallel segments of one route joined by a single segment keep at
 * the least, or the gap they had when it is less, so the segment between them never
 * folds.
 */
const LEAST_JOG = 1;

/**
 * How many times the decided order is made again for facing pairs found standing
 * against it, before the groups they fall in settle for their current order.
 */
const MAX_DECIDED_ORDER_ROUNDS = 4;

/** One end of a route, as the nudging may slide it along the box side it sits on. */
export type RouteEnd = {
	/** Names the box and side the end sits on: ends with the same key share a side. */
	sideKey: string;
	/**
	 * The stretch in px the end point may sit on, as its stub's coordinate across its
	 * run (x on a top or bottom side); always holds the end's current position.
	 */
	slide: { min: number; max: number };
	/**
	 * Indices into the route's `walls` that are no walls to this end's stub: its own
	 * box, and that box's caption when the end sits on the bottom side.
	 */
	ownWallIndices: readonly number[];
};

/** A route the nudging may move the corners and ends of. */
export type RouteToNudge = {
	/**
	 * The whole route: the source end, the corners, the target end, each segment
	 * running straight along x or y. Rewritten in place: its points move, and corners
	 * may go (see nudgeRoutes).
	 */
	path: Point[];
	/** The boxes its edge keeps out of, in the path's coordinates. */
	walls: readonly BoundingBox[];
	/** Where `path[0]` may slide to; see {@link RouteEnd}. */
	source: RouteEnd;
	/** Where the last point of `path` may slide to; see {@link RouteEnd}. */
	target: RouteEnd;
};

/** The whole px a segment may move to, `lowest` above `highest` for one that may not. */
type Channel = { lowest: number; highest: number };

const IMMOVABLE: Channel = { lowest: Infinity, highest: -Infinity };

const NO_OWN_WALLS: ReadonlySet<number> = new Set();

/** One straight segment of a route, in the terms of the axis it moves across. */
type RouteSegment = {
	routeIndex: number;
	/** It runs from `path[segmentIndex]` to `path[segmentIndex + 1]`. */
	segmentIndex: number;
	/** Its coordinate across its own run: x for a vertical segment. */
	position: number;
	/** The low end of the stretch it covers along its run. */
	from: number;
	/** The high end of that stretch. */
	to: number;
	/**
	 * The least whole px it may move to. Above `highest` (Infinity against -Infinity)
	 * for a segment that may not move: one with no room, or a stub with none but where
	 * it stands.
	 */
	lowest: number;
	/** The greatest whole px it may move to; see `lowest`. */
	highest: number;
	/**
	 * The `sideKey` of each route end it is the stub of: none for a segment between two
	 * corners, both ends' for a straight route.
	 */
	sideKeys: readonly string[];
};

/**
 * - `conflict`: closer than the lane spacing (an end pair's end gap) over a shared
 *   stretch; ordered by decideOrder and kept the spacing apart
 * - `order`: further apart, but able to come closer; kept in their current order
 * - `jog`: two segments of one route with a single segment between them, which
 *   must not fold
 */
type SegmentPairKind = "conflict" | "order" | "jog";

type SegmentPair = {
	/** The one first in the current order: an index into the sorted segments. */
	first: number;
	/** The one later in the current order. */
	second: number;
	kind: SegmentPairKind;
	/**
	 * The gap an `order` or `jog` pair keeps, an end pair's cut to the group's end cap
	 * as well; a conflict keeps its group's spacing.
	 */
	gap: number;
	/** Whether decideOrder puts a conflict's `second` on the low side; false otherwise. */
	isSwapped: boolean;
	/**
	 * For two stubs sharing a side, the end gap of that side (the smaller of two): a
	 * conflict then keeps it apart, or the group's end cap when that is less. Undefined
	 * for every other pair, and for a conflict kept as it stands (see toOrderPair).
	 */
	endGap: number | undefined;
};

/** One end of a run: the point it arrives at, and the way on along its route. */
type RunEnd = {
	path: readonly Point[];
	/** The index into `path` of the point the run arrives at. */
	pointIndex: number;
	/** Which way along `path` the route goes on past that point: 1 forward, -1 back. */
	step: 1 | -1;
};

const acrossOf = (point: Point, isVertical: boolean): number =>
	isVertical ? point.x : point.y;

const alongOf = (point: Point, isVertical: boolean): number =>
	isVertical ? point.y : point.x;

const isAtLeast = (value: number, bound: number): boolean =>
	value > bound || isSameCoordinate(value, bound);

const isImmovable = (segment: RouteSegment): boolean =>
	segment.lowest > segment.highest;

/**
 * The whole px a segment may move to, as `lowest` and `highest`: the rectangle it
 * sweeps on the way stays clear of every wall but `ownWalls` (the edge's boxes and the
 * border sides parallel to it), by no less than `clearance` or its current distance,
 * whichever is less; the pieces it adds to its neighbours keep `clearance` from the
 * walls beside them, or what the neighbour already kept from each; and a neighbour
 * that is an end's stub keeps half its length. A stub has no neighbour on its end
 * point's side, and a straight route none at all.
 *
 * @param ownWalls - Indices into the route's walls the segment ignores: its ends' own
 *   (see RouteEnd.ownWallIndices)
 * @param clearance - In px: WALL_CLEARANCE for the spreading
 */
const calcChannel = (
	route: RouteToNudge,
	segmentIndex: number,
	position: number,
	from: number,
	to: number,
	borders: readonly BoundingBox[],
	isVertical: boolean,
	ownWalls: ReadonlySet<number>,
	clearance: number,
): Channel => {
	const { path, walls } = route;
	const last = path.length - 1;
	let lowest = -Infinity;
	let highest = Infinity;
	const limitBelow = (value: number, isStrict: boolean): void => {
		highest = Math.min(
			highest,
			isStrict ? ceilCoordinate(value) - 1 : floorCoordinate(value),
		);
	};
	const limitAbove = (value: number, isStrict: boolean): void => {
		lowest = Math.max(
			lowest,
			isStrict ? floorCoordinate(value) + 1 : ceilCoordinate(value),
		);
	};
	const toAxisExtent = (
		box: BoundingBox,
	): { low: number; high: number; start: number; end: number } =>
		isVertical
			? { low: box.left, high: box.right, start: box.top, end: box.bottom }
			: { low: box.top, high: box.bottom, start: box.left, end: box.right };
	const keepClearOf = (low: number, high: number): void => {
		if (low > position) {
			limitBelow(low - Math.min(low - position, clearance), false);
		} else if (high < position) {
			limitAbove(high + Math.min(position - high, clearance), false);
		} else {
			lowest = Infinity;
			highest = -Infinity;
		}
	};
	const sweptWalls =
		ownWalls.size === 0
			? walls
			: walls.filter((_, index) => !ownWalls.has(index));
	for (const wall of sweptWalls) {
		const extent = toAxisExtent(wall);
		if (extent.start <= to && extent.end >= from) {
			keepClearOf(extent.low, extent.high);
		}
	}
	for (const border of borders) {
		const extent = toAxisExtent(border);
		if (extent.start <= to && extent.end >= from) {
			for (const side of [extent.low, extent.high]) {
				// A segment lying on a side may leave it either way, but not cross it.
				if (!isSameCoordinate(side, position)) {
					keepClearOf(side, side);
				}
			}
		}
	}

	for (const [corner, beyond] of [
		[segmentIndex, segmentIndex - 1],
		[segmentIndex + 1, segmentIndex + 2],
	]) {
		if (beyond < 0 || beyond > last) {
			continue;
		}
		const cornerAlong = alongOf(path[corner], isVertical);
		const beyondAcross = acrossOf(path[beyond], isVertical);
		const oldLow = Math.min(beyondAcross, position);
		const oldHigh = Math.max(beyondAcross, position);
		// Moving away from where the neighbour comes from is what lengthens it.
		const lengthensUp = beyondAcross < position;
		const keepPieceClear = (
			low: number,
			high: number,
			distance: number,
		): void => {
			const required =
				low <= oldHigh && high >= oldLow
					? Math.min(clearance, distance)
					: clearance;
			if (distance >= required) {
				return;
			}
			if (lengthensUp && low > position) {
				limitBelow(low, true);
			} else if (!lengthensUp && high < position) {
				limitAbove(high, true);
			}
		};
		for (const wall of sweptWalls) {
			const extent = toAxisExtent(wall);
			// A wall straddling the neighbour's line is the sweep's to keep out of.
			if (extent.start > cornerAlong) {
				keepPieceClear(extent.low, extent.high, extent.start - cornerAlong);
			} else if (extent.end < cornerAlong) {
				keepPieceClear(extent.low, extent.high, cornerAlong - extent.end);
			}
		}
		for (const border of borders) {
			const extent = toAxisExtent(border);
			for (const side of [extent.start, extent.end]) {
				keepPieceClear(extent.low, extent.high, Math.abs(side - cornerAlong));
			}
		}
	}

	const keepStub = (anchor: Point): void => {
		const anchorAcross = acrossOf(anchor, isVertical);
		const halfLength = (position - anchorAcross) / 2;
		if (halfLength > 0) {
			limitAbove(anchorAcross + halfLength, false);
		} else {
			limitBelow(anchorAcross + halfLength, false);
		}
	};
	if (segmentIndex === 1) {
		keepStub(path[0]);
	}
	if (segmentIndex === last - 2) {
		keepStub(path[last]);
	}
	return { lowest, highest };
};

/**
 * A stub's channel cut to the stretch each of its ends (both, for a straight route)
 * may slide over; immovable when that leaves it no whole px but where it stands.
 */
const cutToSlides = (
	channel: Channel,
	position: number,
	ends: readonly RouteEnd[],
): Channel => {
	const lowest = Math.max(
		channel.lowest,
		ceilCoordinate(Math.max(...ends.map(({ slide }) => slide.min))),
	);
	const highest = Math.min(
		channel.highest,
		floorCoordinate(Math.min(...ends.map(({ slide }) => slide.max))),
	);
	return lowest > highest ||
		(lowest === highest && isSameCoordinate(lowest, position))
		? IMMOVABLE
		: { lowest, highest };
};

/** The ends a route's segment is the stub of: both for a straight route. */
const listStubEnds = (
	{ source, target }: RouteToNudge,
	pathLength: number,
	segmentIndex: number,
): RouteEnd[] => [
	...(segmentIndex === 0 ? [source] : []),
	...(segmentIndex === pathLength - 2 ? [target] : []),
];

/**
 * The channel of a segment of `route` (see calcChannel), its ends' own walls left out
 * and cut to their slides (see cutToSlides) for a stub.
 */
const calcSegmentChannel = (
	route: RouteToNudge,
	segmentIndex: number,
	position: number,
	from: number,
	to: number,
	borders: readonly BoundingBox[],
	isVertical: boolean,
	clearance: number,
): Channel => {
	const ends = listStubEnds(route, route.path.length, segmentIndex);
	const channel = calcChannel(
		route,
		segmentIndex,
		position,
		from,
		to,
		borders,
		isVertical,
		ends.length === 0
			? NO_OWN_WALLS
			: new Set(ends.flatMap(({ ownWallIndices }) => ownWallIndices)),
		clearance,
	);
	return ends.length === 0 ? channel : cutToSlides(channel, position, ends);
};

/**
 * `segment`'s channel bounded so it stays on its own side of `partner`, the
 * coordinate of a parallel segment of its route with a single segment between them,
 * LEAST_JOG off or as near as it stands, so the segment between them never folds.
 *
 * @param isPartnerAfter - Whether the partner comes later along the path
 */
const keepJog = (
	segment: RouteSegment,
	partner: number,
	isPartnerAfter: boolean,
): Channel => {
	const { position, lowest, highest } = segment;
	const difference = isPartnerAfter ? partner - position : position - partner;
	const gap = Math.min(LEAST_JOG, Math.abs(difference));
	return difference >= 0 === isPartnerAfter
		? { lowest, highest: Math.min(highest, floorCoordinate(partner - gap)) }
		: { lowest: Math.max(lowest, ceilCoordinate(partner + gap)), highest };
};

/**
 * Bound one route's segments so none folds the one between it and its partner two
 * on, where no jog pair (see listSegmentPairs) will: segment 2 by the source end and
 * segment last − 3 by the target end, when that end's stub cannot move; and a stub
 * that can by its partner, when the partner cannot. Whether a stub can move is
 * judged before any of these bounds, so neither stub of a Z route decides the other.
 *
 * @param bySegmentIndex - The route's segments along the axis, by their index along
 *   the route; updated in place
 */
const applyJogBounds = (
	path: readonly Point[],
	bySegmentIndex: ReadonlyMap<number, RouteSegment>,
	isVertical: boolean,
): void => {
	const last = path.length - 1;
	const sourceStub = bySegmentIndex.get(0);
	const targetStub = bySegmentIndex.get(last - 1);
	const canSourceMove = sourceStub !== undefined && !isImmovable(sourceStub);
	const canTargetMove = targetStub !== undefined && !isImmovable(targetStub);
	const afterSource = bySegmentIndex.get(2);
	const beforeTarget = bySegmentIndex.get(last - 3);
	if (afterSource !== undefined && !canSourceMove) {
		Object.assign(
			afterSource,
			keepJog(afterSource, acrossOf(path[0], isVertical), false),
		);
	}
	if (beforeTarget !== undefined && !canTargetMove) {
		Object.assign(
			beforeTarget,
			keepJog(beforeTarget, acrossOf(path[last], isVertical), true),
		);
	}
	if (canSourceMove && afterSource !== undefined && isImmovable(afterSource)) {
		Object.assign(sourceStub, keepJog(sourceStub, afterSource.position, true));
	}
	if (
		canTargetMove &&
		beforeTarget !== undefined &&
		isImmovable(beforeTarget)
	) {
		Object.assign(
			targetStub,
			keepJog(targetStub, beforeTarget.position, false),
		);
	}
};

/**
 * Every segment running along the axis, in the current order: by position, then by
 * route, then along the route. A stub may move only along its side, within its ends'
 * slides.
 */
const collectSegments = (
	routes: readonly RouteToNudge[],
	borders: readonly BoundingBox[],
	isVertical: boolean,
): RouteSegment[] => {
	const segments: RouteSegment[] = [];
	routes.forEach((route, routeIndex) => {
		const { path } = route;
		const bySegmentIndex = new Map<number, RouteSegment>();
		for (
			let segmentIndex = 0;
			segmentIndex < path.length - 1;
			segmentIndex += 1
		) {
			const start = path[segmentIndex];
			const end = path[segmentIndex + 1];
			if (isSameCoordinate(start.x, end.x) !== isVertical) {
				continue;
			}
			const position = acrossOf(start, isVertical);
			const from = Math.min(
				alongOf(start, isVertical),
				alongOf(end, isVertical),
			);
			const to = Math.max(alongOf(start, isVertical), alongOf(end, isVertical));
			const segment: RouteSegment = {
				routeIndex,
				segmentIndex,
				position,
				from,
				to,
				...calcSegmentChannel(
					route,
					segmentIndex,
					position,
					from,
					to,
					borders,
					isVertical,
					WALL_CLEARANCE,
				),
				sideKeys: listStubEnds(route, path.length, segmentIndex).map(
					({ sideKey }) => sideKey,
				),
			};
			segments.push(segment);
			bySegmentIndex.set(segmentIndex, segment);
		}
		applyJogBounds(path, bySegmentIndex, isVertical);
	});
	return segments.sort(
		(a, b) =>
			a.position - b.position ||
			a.routeIndex - b.routeIndex ||
			a.segmentIndex - b.segmentIndex,
	);
};

const isJogPair = (a: RouteSegment, b: RouteSegment): boolean =>
	a.routeIndex === b.routeIndex &&
	Math.abs(a.segmentIndex - b.segmentIndex) === 2;

/** The length two segments' stretches share: negative when apart, 0 when they touch. */
const calcOverlap = (
	a: Pick<RouteSegment, "from" | "to">,
	b: Pick<RouteSegment, "from" | "to">,
): number => Math.min(a.to, b.to) - Math.max(a.from, b.from);

/**
 * Whether two parallel segments share a stretch: one that only touches counts across
 * routes, not within one.
 */
const isAlongside = (
	a: Pick<RouteSegment, "routeIndex" | "from" | "to">,
	b: Pick<RouteSegment, "routeIndex" | "from" | "to">,
): boolean => {
	const overlap = calcOverlap(a, b);
	if (a.routeIndex === b.routeIndex) {
		return overlap > 0 && !isSameCoordinate(overlap, 0);
	}
	return isAtLeast(overlap, 0);
};

/**
 * The end gap two parallel segments keep as stubs sharing a side, the smaller of two
 * when they share two (see calcEndGaps); undefined when they share none.
 */
const findEndGap = (
	a: Pick<RouteSegment, "sideKeys">,
	b: Pick<RouteSegment, "sideKeys">,
	endGaps: ReadonlyMap<string, number>,
): number | undefined => {
	let endGap: number | undefined;
	for (const sideKey of a.sideKeys) {
		const gap = b.sideKeys.includes(sideKey) ? endGaps.get(sideKey) : undefined;
		if (gap !== undefined && (endGap === undefined || gap < endGap)) {
			endGap = gap;
		}
	}
	return endGap;
};

/**
 * Whether two parallel segments, at least one movable, run closer than the lane
 * spacing, or than `endGap` for an end pair, over a shared stretch (see isAlongside).
 */
const isConflicting = (
	a: RouteSegment,
	b: RouteSegment,
	endGap: number | undefined,
): boolean => {
	return (
		!(isImmovable(a) && isImmovable(b)) &&
		!isJogPair(a, b) &&
		Math.abs(a.position - b.position) < (endGap ?? GAP_LANE_SPACING) &&
		isAlongside(a, b)
	);
};

/**
 * Pairs of segments with no other between them in `order` over some stretch they
 * share, which includes each segment's nearest overlapping neighbour on either side,
 * each as indices into `segments`, the earlier in `order` first. A sweep keeps, for
 * every stretch of the run axis, the last segment seen covering it.
 *
 * @param order - Every index into `segments`
 */
const listFacingPairs = (
	segments: readonly RouteSegment[],
	order: readonly number[],
): [number, number][] => {
	const pairs: [number, number][] = [];
	const seen = new Set<number>();
	const starts: number[] = [];
	const ends: number[] = [];
	const owners: number[] = [];
	for (const index of order) {
		const { from, to } = segments[index];
		let low = 0;
		let high = ends.length;
		while (low < high) {
			const middle = (low + high) >> 1;
			if (ends[middle] > from && !isSameCoordinate(ends[middle], from)) {
				high = middle;
			} else {
				low = middle + 1;
			}
		}
		const first = low;
		let last = first;
		while (
			last < starts.length &&
			starts[last] < to &&
			!isSameCoordinate(starts[last], to)
		) {
			const owner = owners[last];
			const key = owner * segments.length + index;
			if (!seen.has(key)) {
				seen.add(key);
				pairs.push([owner, index]);
			}
			last += 1;
		}
		const replacing = {
			starts: [from],
			ends: [to],
			owners: [index],
		};
		if (last > first && starts[first] < from) {
			replacing.starts.unshift(starts[first]);
			replacing.ends.unshift(from);
			replacing.owners.unshift(owners[first]);
		}
		if (last > first && ends[last - 1] > to) {
			replacing.starts.push(to);
			replacing.ends.push(ends[last - 1]);
			replacing.owners.push(owners[last - 1]);
		}
		starts.splice(first, last - first, ...replacing.starts);
		ends.splice(first, last - first, ...replacing.ends);
		owners.splice(first, last - first, ...replacing.owners);
	}
	return pairs;
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

/** The ends of a segment's run, the one at its `from` first. */
const listRunEnds = (
	segment: RouteSegment,
	routes: readonly RouteToNudge[],
	isVertical: boolean,
): { low: RunEnd; high: RunEnd } => {
	const { path } = routes[segment.routeIndex];
	const start: RunEnd = { path, pointIndex: segment.segmentIndex, step: -1 };
	const end: RunEnd = { path, pointIndex: segment.segmentIndex + 1, step: 1 };
	return alongOf(path[start.pointIndex], isVertical) <
		alongOf(path[end.pointIndex], isVertical)
		? { low: start, high: end }
		: { low: end, high: start };
};

/**
 * The order two conflicting segments should take so their routes do not cross where
 * they run together (Wybrow, Marriott & Stuckey 2009): each end of the stretch they
 * share has its say (see judgeEnd), and the low end's wins when they disagree. Two
 * that only touch end to end are judged where they touch, by their turns alone.
 *
 * @returns 1 for a on the high side of b, -1 for the low, 0 for no preference
 */
const decideOrder = (
	a: RouteSegment,
	b: RouteSegment,
	routes: readonly RouteToNudge[],
	isVertical: boolean,
): number => {
	const endsOfA = listRunEnds(a, routes, isVertical);
	const endsOfB = listRunEnds(b, routes, isVertical);
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

/**
 * The nodes 0 to `count` - 1 in an order keeping every edge's from before its to,
 * ties broken by the nodes' own order, and a cycle by taking its earliest node first.
 */
const orderTopologically = (
	count: number,
	edges: readonly (readonly [number, number])[],
): number[] => {
	const successors: number[][] = Array.from({ length: count }, () => []);
	const inDegrees = new Array<number>(count).fill(0);
	for (const [from, to] of edges) {
		successors[from].push(to);
		inDegrees[to] += 1;
	}
	// Kept descending, so the earliest ready node is popped from the end.
	const ready: number[] = [];
	const makeReady = (index: number): void => {
		let low = 0;
		let high = ready.length;
		while (low < high) {
			const middle = (low + high) >> 1;
			if (ready[middle] > index) {
				low = middle + 1;
			} else {
				high = middle;
			}
		}
		ready.splice(low, 0, index);
	};
	inDegrees.forEach((inDegree, index) => {
		if (inDegree === 0) {
			makeReady(index);
		}
	});
	const isPlaced = new Array<boolean>(count).fill(false);
	const sequence: number[] = [];
	let earliestUnplaced = 0;
	while (sequence.length < count) {
		if (ready.length === 0) {
			while (isPlaced[earliestUnplaced]) {
				earliestUnplaced += 1;
			}
			makeReady(earliestUnplaced);
		}
		const index = ready.pop() as number;
		if (isPlaced[index]) {
			continue;
		}
		isPlaced[index] = true;
		sequence.push(index);
		for (const successor of successors[index]) {
			inDegrees[successor] -= 1;
			if (inDegrees[successor] === 0 && !isPlaced[successor]) {
				makeReady(successor);
			}
		}
	}
	return sequence;
};

/**
 * Every pair the spreading must keep apart, each as indices into `segments` (sorted by
 * position): the conflicting pairs, with the order decideOrder sets them in;
 * each route's segments with one segment between them, both movable; and the facing
 * pairs (see listFacingPairs) whose room to move lets them come nearer than they keep,
 * facing in the current order or in the decided one, where a conflict turned round
 * can bring two others face to face. A pair neither of which may move is left out.
 * Two stubs sharing a side are an end pair, held to the side's end gap in place of
 * the lane spacing.
 *
 * @param endGaps - The end gap of each side two or more ends share, by `sideKey`
 */
const listSegmentPairs = (
	segments: readonly RouteSegment[],
	routes: readonly RouteToNudge[],
	isVertical: boolean,
	endGaps: ReadonlyMap<string, number>,
): SegmentPair[] => {
	const pairs: SegmentPair[] = [];
	const decidedEdges: [number, number][] = [];
	const pairKeys = new Set<number>();
	const addPair = (pair: SegmentPair): void => {
		pairKeys.add(pair.first * segments.length + pair.second);
		pairs.push(pair);
		decidedEdges.push([pair.first, pair.second]);
	};
	for (let first = 0; first < segments.length; first += 1) {
		for (
			let second = first + 1;
			second < segments.length &&
			segments[second].position - segments[first].position < PAIR_SCAN_SPACING;
			second += 1
		) {
			const a = segments[first];
			const b = segments[second];
			const endGap = findEndGap(a, b, endGaps);
			if (isConflicting(a, b, endGap)) {
				const isSwapped = decideOrder(a, b, routes, isVertical) > 0;
				pairKeys.add(first * segments.length + second);
				pairs.push({
					first,
					second,
					kind: "conflict",
					gap: 0,
					isSwapped,
					endGap,
				});
				decidedEdges.push(isSwapped ? [second, first] : [first, second]);
			}
		}
	}
	const indexByKey = new Map<string, number>();
	segments.forEach(({ routeIndex, segmentIndex }, index) => {
		indexByKey.set(`${routeIndex}:${segmentIndex}`, index);
	});
	segments.forEach((segment, index) => {
		const partner = indexByKey.get(
			`${segment.routeIndex}:${segment.segmentIndex + 2}`,
		);
		if (
			partner === undefined ||
			isImmovable(segment) ||
			isImmovable(segments[partner])
		) {
			return;
		}
		const [first, second] =
			index < partner ? [index, partner] : [partner, index];
		addPair({
			first,
			second,
			isSwapped: false,
			kind: "jog",
			gap: Math.min(
				LEAST_JOG,
				segments[second].position - segments[first].position,
			),
			endGap: undefined,
		});
	});
	const lowestOf = (segment: RouteSegment): number =>
		isImmovable(segment)
			? segment.position
			: Math.min(segment.position, segment.lowest);
	const highestOf = (segment: RouteSegment): number =>
		isImmovable(segment)
			? segment.position
			: Math.max(segment.position, segment.highest);
	/** Whether a pair it adds stands against `order`, which must then be made again. */
	const addFacingPairs = (order: readonly number[]): boolean => {
		let isReversed = false;
		for (const [one, other] of listFacingPairs(segments, order)) {
			const [first, second] = one < other ? [one, other] : [other, one];
			const a = segments[first];
			const b = segments[second];
			if (
				pairKeys.has(first * segments.length + second) ||
				(isImmovable(a) && isImmovable(b)) ||
				isJogPair(a, b)
			) {
				continue;
			}
			const endGap = findEndGap(a, b, endGaps);
			const gap = Math.min(endGap ?? GAP_LANE_SPACING, b.position - a.position);
			if (
				highestOf(a) + gap > lowestOf(b) &&
				!isSameCoordinate(highestOf(a) + gap, lowestOf(b))
			) {
				addPair({
					first,
					second,
					kind: "order",
					gap,
					isSwapped: false,
					endGap,
				});
				isReversed ||= one !== first;
			}
		}
		return isReversed;
	};
	addFacingPairs(segments.map((_, index) => index));
	for (let round = 0; ; round += 1) {
		// A cycle is broken at its earliest segment, which takes back a conflict's
		// decided order and never a pair's current one, those all running forward.
		const decidedOrder = orderTopologically(segments.length, decidedEdges);
		if (round === MAX_DECIDED_ORDER_ROUNDS || !addFacingPairs(decidedOrder)) {
			return pairs;
		}
	}
};

/**
 * Whole-px positions for a group's members, the pairs set in the order of `sequence`
 * (every pair's segment earlier in it on the low side), the conflicting ones at
 * least `spacing` apart, and the end pairs at least their own gap or `endCap`,
 * whichever is less. A member may stay where it stands or move to any whole px of
 * its channel. Going back from the last place, each takes the greatest position its
 * pairs with the places after it leave; then going on from the first, each takes the
 * one nearest the solver's that its pairs with the places before it leave, below its
 * greatest, which such a position always is. A place left no greatest is where the
 * group does not fit: following from it the pairs that held each place down, the
 * first conflict met is the one in the way, and there always is one, as the pairs
 * but conflicts all leave every segment room to stand where it stands. A member that
 * keeps its position keeps its coordinate exactly.
 *
 * @param sequence - Every segment the pairs name, as indices into `segments`
 * @param endCap - Caps the least separation of an end pair: a conflicting one keeps
 *   at least the lesser of this and its end gap, an order one the lesser of this and
 *   its own gap
 * @param members - The movable segments that may move here; every other one the
 *   pairs name stands at its entry in `positions`
 * @returns The new position of each member that moves, by its index; for a group
 *   that does not fit, the conflict in the way; undefined when `sequence` reverses a
 *   pair that must keep its own order
 * @throws Error for a group that does not fit with no conflict in the way, which the
 *   pairs it is given never make
 */
const arrangeGroup = (
	segments: readonly RouteSegment[],
	pairs: readonly SegmentPair[],
	sequence: readonly number[],
	spacing: number,
	endCap: number,
	members: ReadonlySet<number>,
	positions: readonly number[],
): Map<number, number> | SegmentPair | undefined => {
	const placeOf = new Map(sequence.map((node, index) => [node, index]));
	const constraints: SeparationConstraint[] = [];
	const keptGapOf = ({ kind, gap, endGap }: SegmentPair): number => {
		if (kind === "conflict") {
			return endGap === undefined ? spacing : Math.min(endGap, endCap);
		}
		return endGap === undefined ? gap : Math.min(gap, endCap);
	};
	for (const pair of pairs) {
		const { first, second, kind } = pair;
		const firstPlace = placeOf.get(first) as number;
		const secondPlace = placeOf.get(second) as number;
		if (kind !== "conflict" && firstPlace > secondPlace) {
			return undefined;
		}
		constraints.push({
			left: Math.min(firstPlace, secondPlace),
			right: Math.max(firstPlace, secondPlace),
			gap: keptGapOf(pair),
		});
	}
	const variables = sequence.map((node): SeparationVariable => {
		const segment = segments[node];
		return members.has(node)
			? {
					desired: segment.position,
					isFixed: false,
					low: Math.min(segment.position, segment.lowest),
					high: Math.max(segment.position, segment.highest),
				}
			: {
					desired: positions[node],
					isFixed: true,
					low: positions[node],
					high: positions[node],
				};
	});
	// Constraint indices, which are the pairs' too.
	const ins: number[][] = sequence.map(() => []);
	const outs: number[][] = sequence.map(() => []);
	constraints.forEach(({ left, right }, index) => {
		ins[right].push(index);
		outs[left].push(index);
	});

	const greatest: number[] = new Array<number>(sequence.length);
	/** The constraint that held each place below its own greatest, when one did. */
	const heldBy: (number | undefined)[] = new Array<number | undefined>(
		sequence.length,
	);
	for (let place = sequence.length - 1; place >= 0; place -= 1) {
		let most = Infinity;
		let holder: number | undefined;
		for (const index of outs[place]) {
			const { right, gap } = constraints[index];
			if (greatest[right] - gap < most) {
				most = greatest[right] - gap;
				holder = index;
			}
		}
		const { desired, isFixed, high } = variables[place];
		const segment = segments[sequence[place]];
		const candidates = isAtLeast(most, desired) ? [desired] : [];
		if (!isFixed) {
			const highestWhole = floorCoordinate(Math.min(most, segment.highest));
			if (highestWhole >= segment.lowest) {
				candidates.push(highestWhole);
			}
		}
		if (candidates.length === 0) {
			for (
				let index = holder;
				index !== undefined;
				index = heldBy[constraints[index].right]
			) {
				if (pairs[index].kind === "conflict") {
					return pairs[index];
				}
			}
			throw new Error(
				"nudgeRoutes: a group that does not fit has no conflict in the way",
			);
		}
		greatest[place] = Math.max(...candidates);
		heldBy[place] = greatest[place] < high ? holder : undefined;
	}

	const solved = solveSeparation(variables, constraints);
	const placed: number[] = [];
	for (let place = 0; place < sequence.length; place += 1) {
		const { desired, isFixed } = variables[place];
		let least = -Infinity;
		for (const index of ins[place]) {
			const { left, gap } = constraints[index];
			least = Math.max(least, placed[left] + gap);
		}
		const keepsPosition =
			isAtLeast(desired, least) && isAtLeast(greatest[place], desired);
		if (
			isFixed ||
			(keepsPosition && isSameCoordinate(solved[place], desired))
		) {
			placed.push(desired);
			continue;
		}
		const segment = segments[sequence[place]];
		const low = Math.max(segment.lowest, ceilCoordinate(least));
		const high = Math.min(segment.highest, floorCoordinate(greatest[place]));
		placed.push(
			low <= high
				? Math.min(Math.max(Math.round(solved[place]), low), high)
				: desired,
		);
	}
	const moved = new Map<number, number>();
	sequence.forEach((node, place) => {
		if (
			!variables[place].isFixed &&
			placed[place] !== segments[node].position
		) {
			moved.set(node, placed[place]);
		}
	});
	return moved;
};

/** The current order's pair for a conflict: kept as the segments stand, no nearer. */
const toOrderPair = (
	segments: readonly RouteSegment[],
	{ first, second }: SegmentPair,
): SegmentPair => ({
	first,
	second,
	kind: "order",
	gap: Math.min(
		GAP_LANE_SPACING,
		segments[second].position - segments[first].position,
	),
	isSwapped: false,
	endGap: undefined,
});

/**
 * New positions for one group's members. The conflicts that keep the group from
 * fitting even at LEAST_LANE_SPACING, end pairs at it too, in the decided order or
 * the current one, are found one at a time where the current order fails (see
 * arrangeGroup) and kept as they stand instead (see toOrderPair), so they hold back no
 * other; the rest are set in the order decideOrder gives them, the other pairs in
 * their own, at the lane spacing or the widest whole px down to LEAST_LANE_SPACING
 * that fits, trying the current order at each spacing when the decided one does not
 * fit. At each spacing the end pairs squeeze first: the group takes the widest end
 * cap from the spacing's share of EDGE_END_SPACING down to LEAST_LANE_SPACING that
 * fits, and only a group that fits with none goes on to a narrower spacing. Empty
 * when nothing moves.
 *
 * @param members - See arrangeGroup
 * @param positions - See arrangeGroup
 */
const spreadGroup = (
	segments: readonly RouteSegment[],
	groupPairs: readonly SegmentPair[],
	members: ReadonlySet<number>,
	positions: readonly number[],
): Map<number, number> => {
	const nodes = [
		...new Set(groupPairs.flatMap(({ first, second }) => [first, second])),
	].sort((a, b) => a - b);
	const localIndex = new Map(nodes.map((node, index) => [node, index]));
	let pairs = groupPairs;
	/** The group's arrangement, or the conflict in the way in the current order. */
	const arrange = (
		spacing: number,
		endCap: number,
	): Map<number, number> | SegmentPair => {
		const decided = orderTopologically(
			nodes.length,
			pairs.map(({ first, second, isSwapped }) => {
				const edge = [
					localIndex.get(first) as number,
					localIndex.get(second) as number,
				] as const;
				return isSwapped ? ([edge[1], edge[0]] as const) : edge;
			}),
		).map((index) => nodes[index]);
		const inDecidedOrder = arrangeGroup(
			segments,
			pairs,
			decided,
			spacing,
			endCap,
			members,
			positions,
		);
		if (inDecidedOrder instanceof Map) {
			return inDecidedOrder;
		}
		// The current order reverses no pair, so it fits or names the conflict.
		return (
			decided.every((node, index) => node === nodes[index])
				? inDecidedOrder
				: arrangeGroup(
						segments,
						pairs,
						nodes,
						spacing,
						endCap,
						members,
						positions,
					)
		) as Map<number, number> | SegmentPair;
	};
	for (
		let atLeastSpacing = arrange(LEAST_LANE_SPACING, LEAST_LANE_SPACING);
		!(atLeastSpacing instanceof Map);
		atLeastSpacing = arrange(LEAST_LANE_SPACING, LEAST_LANE_SPACING)
	) {
		const blocking = atLeastSpacing;
		pairs = pairs.map((pair) =>
			pair === blocking ? toOrderPair(segments, pair) : pair,
		);
	}
	if (!pairs.some(({ kind }) => kind === "conflict")) {
		return new Map();
	}
	const hasEndPairs = pairs.some(({ endGap }) => endGap !== undefined);
	for (
		let spacing = GAP_LANE_SPACING;
		spacing >= LEAST_LANE_SPACING;
		spacing -= 1
	) {
		const atLeastEndCap = arrange(spacing, LEAST_LANE_SPACING);
		if (!(atLeastEndCap instanceof Map)) {
			continue;
		}
		if (!hasEndPairs) {
			return atLeastEndCap;
		}
		for (
			let endCap = Math.round((spacing * EDGE_END_SPACING) / GAP_LANE_SPACING);
			endCap > LEAST_LANE_SPACING;
			endCap -= 1
		) {
			const arrangement = arrange(spacing, endCap);
			if (arrangement instanceof Map) {
				return arrangement;
			}
		}
		return atLeastEndCap;
	}
	return new Map();
};

/**
 * Spread apart the segments running along one axis (vertical ones in x when
 * `isVertical`). The movable segments that conflicts and jogs link make a group; the
 * groups are spread one by one in the current order of their first segment, each
 * holding the facing pairs it shares with another group against where the groups
 * before it left that one, so the pair keeps its gap whichever moves.
 *
 * @param endGaps - See listSegmentPairs
 */
const nudgeAlong = (
	routes: readonly RouteToNudge[],
	borders: readonly BoundingBox[],
	isVertical: boolean,
	endGaps: ReadonlyMap<string, number>,
): void => {
	const segments = collectSegments(routes, borders, isVertical);
	const pairs = listSegmentPairs(segments, routes, isVertical, endGaps);
	const parents = segments.map((_, index) => index);
	const findRoot = (index: number): number => {
		let root = index;
		while (parents[root] !== root) {
			root = parents[root];
		}
		for (let at = index; parents[at] !== root;) {
			const next = parents[at];
			parents[at] = root;
			at = next;
		}
		return root;
	};
	for (const { first, second, kind } of pairs) {
		if (
			kind !== "order" &&
			!isImmovable(segments[first]) &&
			!isImmovable(segments[second])
		) {
			parents[findRoot(second)] = findRoot(first);
		}
	}
	const groups = new Map<
		number,
		{ members: Set<number>; pairs: SegmentPair[] }
	>();
	segments.forEach((segment, index) => {
		if (isImmovable(segment)) {
			return;
		}
		const root = findRoot(index);
		const group = groups.get(root);
		if (group === undefined) {
			groups.set(root, { members: new Set([index]), pairs: [] });
		} else {
			group.members.add(index);
		}
	});
	for (const pair of pairs) {
		const roots = new Set(
			[pair.first, pair.second]
				.filter((node) => !isImmovable(segments[node]))
				.map(findRoot),
		);
		for (const root of roots) {
			(groups.get(root) as { pairs: SegmentPair[] }).pairs.push(pair);
		}
	}
	// Every group is judged on the routes as they stood; all move at once at the end.
	const positions = segments.map(({ position }) => position);
	const moves = new Map<number, number>();
	for (const { members, pairs: groupPairs } of groups.values()) {
		if (!groupPairs.some(({ kind }) => kind === "conflict")) {
			continue;
		}
		for (const [node, position] of spreadGroup(
			segments,
			groupPairs,
			members,
			positions,
		)) {
			positions[node] = position;
			moves.set(node, position);
		}
	}
	for (const [node, position] of moves) {
		const { routeIndex, segmentIndex } = segments[node];
		const { path } = routes[routeIndex];
		for (const point of [path[segmentIndex], path[segmentIndex + 1]]) {
			if (isVertical) {
				point.x = position;
			} else {
				point.y = position;
			}
		}
	}
};

/**
 * The end gap of each side two or more route ends share, by `sideKey`: the length
 * from the lowest of their slides' mins to the highest of their maxes, shared among
 * the k ends as k − 1 whole-px gaps, at most EDGE_END_SPACING and at least
 * LEAST_LANE_SPACING. A straight route is an end on each of its two sides.
 */
const calcEndGaps = (routes: readonly RouteToNudge[]): Map<string, number> => {
	const stretches = new Map<
		string,
		{ count: number; min: number; max: number }
	>();
	for (const { source, target } of routes) {
		for (const { sideKey, slide } of [source, target]) {
			const stretch = stretches.get(sideKey);
			if (stretch === undefined) {
				stretches.set(sideKey, { count: 1, ...slide });
			} else {
				stretch.count += 1;
				stretch.min = Math.min(stretch.min, slide.min);
				stretch.max = Math.max(stretch.max, slide.max);
			}
		}
	}
	const endGaps = new Map<string, number>();
	for (const [sideKey, { count, min, max }] of stretches) {
		if (count >= 2) {
			endGaps.set(
				sideKey,
				Math.max(
					LEAST_LANE_SPACING,
					Math.min(
						EDGE_END_SPACING,
						floorCoordinate((max - min) / (count - 1)),
					),
				),
			);
		}
	}
	return endGaps;
};

/** -1, 0 or 1 as `value` lies below, at or above 0, a float's noise counting as 0. */
const signOf = (value: number): number =>
	isSameCoordinate(value, 0) ? 0 : Math.sign(value);

const isZeroLength = (start: Point, end: Point): boolean =>
	isSameCoordinate(start.x, end.x) && isSameCoordinate(start.y, end.y);

/** Which way segment `index` of `path` runs along its own run: 1 toward greater. */
const runSignOf = (
	path: readonly Point[],
	index: number,
	isVertical: boolean,
): number =>
	signOf(
		alongOf(path[index + 1], isVertical) - alongOf(path[index], isVertical),
	);

/** A segment as the straightening sets it against the segments parallel to it. */
type Stretch = Pick<
	RouteSegment,
	"routeIndex" | "position" | "from" | "to" | "sideKeys"
>;

const toStretch = (
	route: RouteToNudge,
	routeIndex: number,
	path: readonly Point[],
	index: number,
	isVertical: boolean,
): Stretch => {
	const start = path[index];
	const end = path[index + 1];
	return {
		routeIndex,
		position: acrossOf(start, isVertical),
		from: Math.min(alongOf(start, isVertical), alongOf(end, isVertical)),
		to: Math.max(alongOf(start, isVertical), alongOf(end, isVertical)),
		sideKeys: listStubEnds(route, path.length, index).map(
			({ sideKey }) => sideKey,
		),
	};
};

/**
 * Every segment running along the axis, `ownPath` standing for the path of route
 * `routeIndex` and its segments in `skipped` left out; a segment of no length runs
 * along neither axis.
 */
const listStretches = (
	routes: readonly RouteToNudge[],
	routeIndex: number,
	ownPath: readonly Point[],
	skipped: ReadonlySet<number>,
	isVertical: boolean,
): Stretch[] => {
	const stretches: Stretch[] = [];
	routes.forEach((route, index) => {
		const path = index === routeIndex ? ownPath : route.path;
		for (let segment = 0; segment < path.length - 1; segment += 1) {
			const start = path[segment];
			const end = path[segment + 1];
			if (
				(index === routeIndex && skipped.has(segment)) ||
				isZeroLength(start, end) ||
				isSameCoordinate(start.x, end.x) !== isVertical
			) {
				continue;
			}
			stretches.push(toStretch(route, index, path, segment, isVertical));
		}
	});
	return stretches;
};

/**
 * Whether `moved`, which stood at `previous`, keeps clear of each of `others` it runs
 * alongside (see isAlongside): on the side it stood on, neither touching nor passing
 * it, and no nearer than the gap they keep (the end gap for two stubs sharing a side,
 * the lane spacing otherwise) or than they stood, whichever is less. A pair not
 * alongside before stood at that gap.
 */
const keepsSpacing = (
	moved: Stretch,
	previous: Pick<Stretch, "position" | "from" | "to">,
	others: readonly Stretch[],
	endGaps: ReadonlyMap<string, number>,
): boolean =>
	others.every((other) => {
		if (!isAlongside(moved, other)) {
			return true;
		}
		const distance = moved.position - other.position;
		const previousDistance = previous.position - other.position;
		const previousSide = signOf(previousDistance);
		if (
			signOf(distance) === 0 ||
			(previousSide !== 0 && signOf(distance) !== previousSide)
		) {
			return false;
		}
		const gap = findEndGap(moved, other, endGaps) ?? GAP_LANE_SPACING;
		const required = isAlongside(
			{ ...previous, routeIndex: moved.routeIndex },
			other,
		)
			? Math.min(gap, Math.abs(previousDistance))
			: gap;
		return isAtLeast(Math.abs(distance), required);
	});

/**
 * How many crossings `pieces` make with the segments of `routes` strictly inside
 * both, `ownPath` standing for the path of route `routeIndex` and its segments in
 * `skipped` left out.
 */
const countCrossings = (
	pieces: readonly (readonly [Point, Point])[],
	routes: readonly RouteToNudge[],
	routeIndex: number,
	ownPath: readonly Point[],
	skipped: ReadonlySet<number>,
): number => {
	let crossings = 0;
	routes.forEach((route, index) => {
		const path = index === routeIndex ? ownPath : route.path;
		for (let segment = 0; segment < path.length - 1; segment += 1) {
			if (index === routeIndex && skipped.has(segment)) {
				continue;
			}
			const start = path[segment];
			const end = path[segment + 1];
			for (const [pieceStart, pieceEnd] of pieces) {
				if (
					doSegmentsIntersectByCoords(
						pieceStart.x,
						pieceStart.y,
						pieceEnd.x,
						pieceEnd.y,
						start.x,
						start.y,
						end.x,
						end.y,
						false,
					)
				) {
					crossings += 1;
				}
			}
		}
	});
	return crossings;
};

/**
 * Whether `coordinate` lies on a whole px of `channel`, or, not being a whole px
 * itself, between the channel's bounds widened to `position`.
 */
const isInChannel = (
	coordinate: number,
	position: number,
	{ lowest, highest }: Channel,
): boolean =>
	isSameCoordinate(coordinate, Math.round(coordinate))
		? isAtLeast(coordinate, lowest) && isAtLeast(highest, coordinate)
		: isAtLeast(coordinate, Math.min(lowest, position)) &&
			isAtLeast(Math.max(highest, position), coordinate);

const withAcross = (
	point: Point,
	coordinate: number,
	isVertical: boolean,
): Point =>
	isVertical ? { x: coordinate, y: point.y } : { x: point.x, y: coordinate };

/**
 * The length of segment `index` of `path` when it is a jog: between two parallel
 * segments running the same way. Undefined for any other segment.
 */
const measureJog = (
	path: readonly Point[],
	index: number,
): number | undefined => {
	if (index < 1 || index > path.length - 3) {
		return undefined;
	}
	for (let segment = index - 1; segment <= index + 1; segment += 1) {
		if (isZeroLength(path[segment], path[segment + 1])) {
			return undefined;
		}
	}
	const isVertical = isSameCoordinate(path[index - 1].x, path[index].x);
	if (
		isSameCoordinate(path[index].x, path[index + 1].x) === isVertical ||
		isSameCoordinate(path[index + 1].x, path[index + 2].x) !== isVertical ||
		runSignOf(path, index - 1, isVertical) !==
			runSignOf(path, index + 1, isVertical)
	) {
		return undefined;
	}
	return Math.abs(
		acrossOf(path[index + 1], isVertical) - acrossOf(path[index], isVertical),
	);
};

/**
 * The path of route `routeIndex` with the jog at `jogIndex` gone, segment
 * `movedIndex` (the one before the jog or the one after) moved sideways onto the
 * other's coordinate and the two merged; undefined when the move is not allowed. It
 * is allowed when the new coordinate lies in the segment's channel (see
 * calcSegmentChannel and isInChannel), and in it again with GAP_LANE_SPACING as the
 * clearance; when the moved segment's other neighbour, its far one, keeps its
 * direction, or closes to no length between two segments running the same way, which
 * merge with it; when the moved segment and its far neighbour's new stretch keep
 * their spacing (see keepsSpacing) to every segment parallel to them but the two
 * merging; and when the three cross no more segments than they did, each one's own
 * neighbours left out.
 */
const straightenJog = (
	routes: readonly RouteToNudge[],
	routeIndex: number,
	jogIndex: number,
	movedIndex: number,
	borders: readonly BoundingBox[],
	endGaps: ReadonlyMap<string, number>,
): Point[] | undefined => {
	const route = routes[routeIndex];
	const { path } = route;
	const isBefore = movedIndex < jogIndex;
	const partnerIndex = isBefore ? jogIndex + 1 : jogIndex - 1;
	const isVertical = isSameCoordinate(
		path[movedIndex].x,
		path[movedIndex + 1].x,
	);
	const moved = toStretch(route, routeIndex, path, movedIndex, isVertical);
	const coordinate = acrossOf(path[partnerIndex], isVertical);
	for (const clearance of [WALL_CLEARANCE, GAP_LANE_SPACING]) {
		const channel = calcSegmentChannel(
			route,
			movedIndex,
			moved.position,
			moved.from,
			moved.to,
			borders,
			isVertical,
			clearance,
		);
		if (!isInChannel(coordinate, moved.position, channel)) {
			return undefined;
		}
	}

	const farIndex = isBefore ? movedIndex - 1 : movedIndex + 1;
	const beyondIndex = isBefore ? farIndex - 1 : farIndex + 1;
	const hasFar = farIndex >= 0 && farIndex <= path.length - 2;
	let isFarClosed = false;
	if (hasFar) {
		const farAcross = acrossOf(
			path[isBefore ? farIndex : farIndex + 1],
			isVertical,
		);
		const newSide = signOf(coordinate - farAcross);
		if (newSide === 0) {
			if (
				beyondIndex < 0 ||
				beyondIndex > path.length - 2 ||
				runSignOf(path, beyondIndex, isVertical) !==
					runSignOf(path, movedIndex, isVertical)
			) {
				return undefined;
			}
			isFarClosed = true;
		} else if (newSide !== signOf(moved.position - farAcross)) {
			return undefined;
		}
	}

	const shifted = path.map((point, index) =>
		index === movedIndex || index === movedIndex + 1
			? withAcross(point, coordinate, isVertical)
			: point,
	);
	const dropped = new Set([jogIndex, jogIndex + 1]);
	if (isFarClosed) {
		dropped.add(farIndex);
		dropped.add(farIndex + 1);
	}
	const straightened = shifted.filter((_, index) => !dropped.has(index));
	const mergedIndex = isBefore && isFarClosed ? movedIndex - 2 : jogIndex - 1;
	const hasNewFar = hasFar && !isFarClosed;
	const newFarIndex = isBefore ? mergedIndex - 1 : mergedIndex + 1;
	const newBeyondIndex = isBefore ? mergedIndex - 2 : mergedIndex + 2;

	if (
		!keepsSpacing(
			{
				...moved,
				position: coordinate,
				sideKeys: listStubEnds(route, straightened.length, mergedIndex).map(
					({ sideKey }) => sideKey,
				),
			},
			moved,
			listStretches(
				routes,
				routeIndex,
				straightened,
				new Set([mergedIndex]),
				isVertical,
			),
			endGaps,
		)
	) {
		return undefined;
	}
	if (
		hasNewFar &&
		!keepsSpacing(
			toStretch(route, routeIndex, straightened, newFarIndex, !isVertical),
			toStretch(route, routeIndex, path, farIndex, !isVertical),
			listStretches(
				routes,
				routeIndex,
				straightened,
				new Set([newFarIndex]),
				!isVertical,
			),
			endGaps,
		)
	) {
		return undefined;
	}

	const crossingsBefore = countCrossings(
		[movedIndex, jogIndex, ...(hasFar ? [farIndex] : [])].map(
			(index) => [path[index], path[index + 1]] as const,
		),
		routes,
		routeIndex,
		path,
		new Set([movedIndex, jogIndex, partnerIndex, farIndex, beyondIndex]),
	);
	const crossingsAfter = countCrossings(
		[
			[shifted[movedIndex], shifted[movedIndex + 1]],
			...(hasNewFar
				? [[straightened[newFarIndex], straightened[newFarIndex + 1]] as const]
				: []),
		],
		routes,
		routeIndex,
		straightened,
		new Set(
			hasNewFar ? [mergedIndex, newFarIndex, newBeyondIndex] : [mergedIndex],
		),
	);
	return crossingsAfter > crossingsBefore ? undefined : straightened;
};

const isAt = (point: Point, other: Point): boolean =>
	point.x === other.x && point.y === other.y;

/** A jog as listed at the start of a walk, its segment by its two points. */
type ListedJog = {
	routeIndex: number;
	length: number;
	start: Point;
	end: Point;
};

/**
 * Remove the jogs of `routes` (see measureJog) where a move is allowed (see
 * straightenJog). Each walk lists every jog and takes them by length, then route,
 * then lower x and lower y, each one still standing removed at once; the walks repeat
 * until one removes none. Of the segments either side of a jog, the shorter moves
 * first, the one with the lower coordinate on equal lengths, and the other when that
 * move is not allowed.
 */
const straightenJogs = (
	routes: readonly RouteToNudge[],
	borders: readonly BoundingBox[],
	endGaps: ReadonlyMap<string, number>,
): void => {
	let hasRemoved: boolean;
	do {
		hasRemoved = false;
		const jogs: ListedJog[] = [];
		routes.forEach(({ path }, routeIndex) => {
			for (let index = 1; index < path.length - 2; index += 1) {
				const length = measureJog(path, index);
				if (length !== undefined) {
					jogs.push({
						routeIndex,
						length,
						start: { ...path[index] },
						end: { ...path[index + 1] },
					});
				}
			}
		});
		const lowOf = ({ start, end }: ListedJog, isX: boolean): number =>
			isX ? Math.min(start.x, end.x) : Math.min(start.y, end.y);
		jogs.sort(
			(a, b) =>
				a.length - b.length ||
				a.routeIndex - b.routeIndex ||
				lowOf(a, true) - lowOf(b, true) ||
				lowOf(a, false) - lowOf(b, false),
		);
		for (const { routeIndex, start, end } of jogs) {
			const { path } = routes[routeIndex];
			const jogIndex = path.findIndex(
				(point, index) =>
					index < path.length - 1 &&
					((isAt(point, start) && isAt(path[index + 1], end)) ||
						(isAt(point, end) && isAt(path[index + 1], start))) &&
					measureJog(path, index) !== undefined,
			);
			if (jogIndex === -1) {
				continue;
			}
			const isVertical = isSameCoordinate(
				path[jogIndex - 1].x,
				path[jogIndex].x,
			);
			const lengthOf = (index: number): number =>
				Math.abs(
					alongOf(path[index + 1], isVertical) -
						alongOf(path[index], isVertical),
				);
			const [before, after] = [jogIndex - 1, jogIndex + 1];
			const isBeforeFirst = isSameCoordinate(lengthOf(before), lengthOf(after))
				? acrossOf(path[before], isVertical) < acrossOf(path[after], isVertical)
				: lengthOf(before) < lengthOf(after);
			for (const movedIndex of isBeforeFirst
				? [before, after]
				: [after, before]) {
				const straightened = straightenJog(
					routes,
					routeIndex,
					jogIndex,
					movedIndex,
					borders,
					endGaps,
				);
				if (straightened !== undefined) {
					path.splice(0, path.length, ...straightened);
					hasRemoved = true;
					break;
				}
			}
		}
	} while (hasRemoved);
};

/**
 * Spread apart routes that run on top of one another or close alongside ("nudging",
 * as in Wybrow, Marriott & Stuckey 2009): every segment moves sideways, its two
 * neighbours stretching or shrinking to keep the route right-angled, so parallel
 * segments sharing a stretch stand {@link GAP_LANE_SPACING} apart, ordered so routes
 * running together do not cross needlessly. A route's first and last segments (its
 * stubs) move too, each end point sliding along its box side within the end's slide,
 * so the ends sharing a side stand up to {@link EDGE_END_SPACING} apart, as far as
 * their slides leave room for. A group of segments with too little room is spread as
 * far as whole px down to LEAST_LANE_SPACING allow, its ends squeezing before its
 * lanes do; a conflicting pair with no room to part at all is kept as it stands,
 * holding back none of the others. The vertical segments move first, then the
 * horizontal ones on the routes as that left them.
 *
 * Last, a jog (a segment between two parallel ones running the same way), of any
 * length, is taken out where one of the two can move onto the other's line without
 * coming nearer than {@link GAP_LANE_SPACING} to a box, a border's side or another
 * segment alongside (than their end gap, for two ends of one side), unless it
 * already ran nearer, and without crossing more segments; its points go, and the two
 * segments merge. An end point moved for it stays on its box side, within its slide.
 *
 * A segment that moves lands on a whole px, or on the exact coordinate of the segment
 * it merges with; one that does not keeps its coordinate exactly.
 *
 * @param routes - In the edges' input order, which breaks ties; each path is
 *   rewritten in place and may lose points, but never its first or last
 * @param borders - Frames whose sides no segment moves across, as walls
 */
export const nudgeRoutes = (
	routes: readonly RouteToNudge[],
	borders: readonly BoundingBox[],
): void => {
	const endGaps = calcEndGaps(routes);
	nudgeAlong(routes, borders, true, endGaps);
	nudgeAlong(routes, borders, false, endGaps);
	straightenJogs(routes, borders, endGaps);
};
