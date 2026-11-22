import type { BoundingBox, Point } from "@jiscribe/geometry";

import {
	ceilCoordinate,
	floorCoordinate,
	isAtLeast,
	isSameCoordinate,
} from "../../shared/coordinate";

/**
 * The narrowest spacing in px a group of runs is squeezed to in a tight channel; a
 * conflict that keeps its group from fitting even at this is kept as it stands.
 */
export const LEAST_LANE_SPACING = 2;

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

/** What every step of the nudging reads, whichever axis it works on. */
export type NudgeContext = {
	routes: readonly RouteToNudge[];
	/** Frames whose sides no segment moves across. */
	borders: readonly BoundingBox[];
	/** The end gap of each side two or more ends share, by `sideKey` (see calcEndGaps). */
	endGaps: ReadonlyMap<string, number>;
};

/** One spreading pass: the segments running along one axis. */
export type NudgePass = NudgeContext & {
	/** True for the vertical segments, which move in x; false for the horizontal ones. */
	isVertical: boolean;
};

/** The whole px a segment may move to, `lowest` above `highest` for one that may not. */
export type Channel = { lowest: number; highest: number };

export const IMMOVABLE: Channel = { lowest: Infinity, highest: -Infinity };

/** One straight segment of a route, in the terms of the axis it moves across. */
export type RouteSegment = {
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

/** One segment of a route, on the route's own path or on one standing for it. */
export type SegmentOnPath = {
	route: RouteToNudge;
	routeIndex: number;
	/** The route's own path, or the one standing for it. */
	path: readonly Point[];
	/** It runs from `path[segmentIndex]` to `path[segmentIndex + 1]`. */
	segmentIndex: number;
};

/** Which segments a walk meets; left empty, every segment of every route. */
export type SegmentWalk = {
	/**
	 * Only the segments running along this axis, vertical ones when true. Read off the
	 * two points' x alone, so a segment of no length counts as vertical unless
	 * `skipZeroLength` leaves it out.
	 */
	isVertical?: boolean;
	/** Whether to leave out the segments of no length. */
	skipZeroLength?: boolean;
	/** A path to walk in place of one route's, with its segments to leave out. */
	standIn?: {
		routeIndex: number;
		path: readonly Point[];
		skipped: ReadonlySet<number>;
	};
};

/** What calcChannel needs to know of one segment. */
export type ChannelRequest = {
	route: RouteToNudge;
	/** It runs from `path[segmentIndex]` to `path[segmentIndex + 1]` of the route. */
	segmentIndex: number;
	/** Its coordinate across its own run: x for a vertical segment. */
	position: number;
	/** The low end of the stretch it covers along its run. */
	from: number;
	/** The high end of that stretch. */
	to: number;
	/** Frames whose sides it may not move across. */
	borders: readonly BoundingBox[];
	/** True for a vertical segment, which moves in x. */
	isVertical: boolean;
	/** In px: WALL_CLEARANCE for the spreading, GAP_LANE_SPACING for the straightening. */
	clearance: number;
};

export const acrossOf = (point: Point, isVertical: boolean): number =>
	isVertical ? point.x : point.y;

export const alongOf = (point: Point, isVertical: boolean): number =>
	isVertical ? point.y : point.x;

export const isImmovable = (segment: RouteSegment): boolean =>
	segment.lowest > segment.highest;

export const isZeroLength = (start: Point, end: Point): boolean =>
	isSameCoordinate(start.x, end.x) && isSameCoordinate(start.y, end.y);

/** Two segments as one number, in the order given; `segmentCount` is above both indices. */
export const pairKey = (
	first: number,
	second: number,
	segmentCount: number,
): number => first * segmentCount + second;

/** Call `visit` for each of one route's segments that `walk` lets through, along the path. */
export const walkRouteSegments = (
	route: RouteToNudge,
	routeIndex: number,
	walk: SegmentWalk,
	visit: (segment: SegmentOnPath) => void,
): void => {
	const standIn =
		walk.standIn?.routeIndex === routeIndex ? walk.standIn : undefined;
	const path = standIn?.path ?? route.path;
	for (
		let segmentIndex = 0;
		segmentIndex < path.length - 1;
		segmentIndex += 1
	) {
		const start = path[segmentIndex];
		const end = path[segmentIndex + 1];
		if (
			standIn?.skipped.has(segmentIndex) ||
			(walk.skipZeroLength === true && isZeroLength(start, end)) ||
			(walk.isVertical !== undefined &&
				isSameCoordinate(start.x, end.x) !== walk.isVertical)
		) {
			continue;
		}
		visit({ route, routeIndex, path, segmentIndex });
	}
};

/** {@link walkRouteSegments} over every route, in the order given. */
export const walkAllSegments = (
	routes: readonly RouteToNudge[],
	walk: SegmentWalk,
	visit: (segment: SegmentOnPath) => void,
): void => {
	routes.forEach((route, routeIndex) => {
		walkRouteSegments(route, routeIndex, walk, visit);
	});
};

/** A segment's place across its run, and the stretch it covers along it. */
export const calcSegmentSpan = (
	{ path, segmentIndex }: Pick<SegmentOnPath, "path" | "segmentIndex">,
	isVertical: boolean,
): { position: number; from: number; to: number } => {
	const start = path[segmentIndex];
	const end = path[segmentIndex + 1];
	return {
		position: acrossOf(start, isVertical),
		from: Math.min(alongOf(start, isVertical), alongOf(end, isVertical)),
		to: Math.max(alongOf(start, isVertical), alongOf(end, isVertical)),
	};
};

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
 */
export const calcChannel = (
	{
		route,
		segmentIndex,
		position,
		from,
		to,
		borders,
		isVertical,
		clearance,
	}: ChannelRequest,
	ownWalls: ReadonlySet<number>,
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

/** The length two segments' stretches share: negative when apart, 0 when they touch. */
export const calcOverlap = (
	a: Pick<RouteSegment, "from" | "to">,
	b: Pick<RouteSegment, "from" | "to">,
): number => Math.min(a.to, b.to) - Math.max(a.from, b.from);

/**
 * Whether two parallel segments share a stretch: one that only touches counts across
 * routes, not within one.
 */
export const isAlongside = (
	a: Pick<RouteSegment, "routeIndex" | "from" | "to">,
	b: Pick<RouteSegment, "routeIndex" | "from" | "to">,
): boolean => {
	const overlap = calcOverlap(a, b);
	if (a.routeIndex === b.routeIndex) {
		return overlap > 0 && !isSameCoordinate(overlap, 0);
	}
	return isAtLeast(overlap, 0);
};
