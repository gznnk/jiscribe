import { doSegmentsIntersectByCoords, type Point } from "@jiscribe/geometry";

import { calcSegmentChannel, findEndGap, listStubEnds } from "./routeEnds";
import {
	type Channel,
	type NudgeContext,
	type RouteSegment,
	type RouteToNudge,
	type SegmentOnPath,
	type SegmentWalk,
	acrossOf,
	alongOf,
	calcSegmentSpan,
	isAlongside,
	isZeroLength,
	walkAllSegments,
} from "./routeSegments";
import { isAtLeast, isSameCoordinate, signOf } from "../../shared/coordinate";
import { GAP_LANE_SPACING } from "../../shared/edgeSpacing";

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

const toStretch = (segment: SegmentOnPath, isVertical: boolean): Stretch => ({
	routeIndex: segment.routeIndex,
	...calcSegmentSpan(segment, isVertical),
	sideKeys: listStubEnds(segment).map(({ sideKey }) => sideKey),
});

/**
 * Every segment running along the axis, with `standIn` in place of its route; a
 * segment of no length runs along neither axis.
 */
const listStretches = (
	routes: readonly RouteToNudge[],
	standIn: SegmentWalk["standIn"],
	isVertical: boolean,
): Stretch[] => {
	const stretches: Stretch[] = [];
	walkAllSegments(
		routes,
		{ isVertical, skipZeroLength: true, standIn },
		(segment) => {
			stretches.push(toStretch(segment, isVertical));
		},
	);
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
 * both, with `standIn` in place of its route.
 */
const countPieceCrossings = (
	pieces: readonly (readonly [Point, Point])[],
	routes: readonly RouteToNudge[],
	standIn: SegmentWalk["standIn"],
): number => {
	let crossings = 0;
	walkAllSegments(routes, { standIn }, ({ path, segmentIndex }) => {
		const start = path[segmentIndex];
		const end = path[segmentIndex + 1];
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
 * is allowed when the new coordinate lies in the segment's channel with
 * GAP_LANE_SPACING as the clearance (see calcSegmentChannel and isInChannel); when
 * the moved segment's other neighbour, its far one, keeps its
 * direction, or closes to no length between two segments running the same way, which
 * merge with it; when the moved segment and its far neighbour's new stretch keep
 * their spacing (see keepsSpacing) to every segment parallel to them but the two
 * merging; and when the three cross no more segments than they did, each one's own
 * neighbours left out.
 */
const straightenJog = (
	{ routes, borders, endGaps }: NudgeContext,
	routeIndex: number,
	jogIndex: number,
	movedIndex: number,
): Point[] | undefined => {
	const route = routes[routeIndex];
	const { path } = route;
	const isBefore = movedIndex < jogIndex;
	const partnerIndex = isBefore ? jogIndex + 1 : jogIndex - 1;
	const isVertical = isSameCoordinate(
		path[movedIndex].x,
		path[movedIndex + 1].x,
	);
	const segmentOn = (
		segmentPath: readonly Point[],
		segmentIndex: number,
	): SegmentOnPath => ({ route, routeIndex, path: segmentPath, segmentIndex });
	const moved = toStretch(segmentOn(path, movedIndex), isVertical);
	const coordinate = acrossOf(path[partnerIndex], isVertical);
	if (
		!isInChannel(
			coordinate,
			moved.position,
			calcSegmentChannel({
				route,
				segmentIndex: movedIndex,
				position: moved.position,
				from: moved.from,
				to: moved.to,
				borders,
				isVertical,
				clearance: GAP_LANE_SPACING,
			}),
		)
	) {
		return undefined;
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
				sideKeys: listStubEnds(segmentOn(straightened, mergedIndex)).map(
					({ sideKey }) => sideKey,
				),
			},
			moved,
			listStretches(
				routes,
				{ routeIndex, path: straightened, skipped: new Set([mergedIndex]) },
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
			toStretch(segmentOn(straightened, newFarIndex), !isVertical),
			toStretch(segmentOn(path, farIndex), !isVertical),
			listStretches(
				routes,
				{ routeIndex, path: straightened, skipped: new Set([newFarIndex]) },
				!isVertical,
			),
			endGaps,
		)
	) {
		return undefined;
	}

	const crossingsBefore = countPieceCrossings(
		[movedIndex, jogIndex, ...(hasFar ? [farIndex] : [])].map(
			(index) => [path[index], path[index + 1]] as const,
		),
		routes,
		{
			routeIndex,
			path,
			skipped: new Set([
				movedIndex,
				jogIndex,
				partnerIndex,
				farIndex,
				beyondIndex,
			]),
		},
	);
	const crossingsAfter = countPieceCrossings(
		[
			[shifted[movedIndex], shifted[movedIndex + 1]],
			...(hasNewFar
				? [[straightened[newFarIndex], straightened[newFarIndex + 1]] as const]
				: []),
		],
		routes,
		{
			routeIndex,
			path: straightened,
			skipped: new Set(
				hasNewFar ? [mergedIndex, newFarIndex, newBeyondIndex] : [mergedIndex],
			),
		},
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
export const straightenJogs = (context: NudgeContext): void => {
	const { routes } = context;
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
					context,
					routeIndex,
					jogIndex,
					movedIndex,
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
