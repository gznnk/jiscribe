import {
	calcEuclideanDistance,
	doRectsOverlap,
	type Point,
	type Rect,
} from "@jiscribe/geometry";

import {
	LABEL_BESIDE_CLEARANCE,
	LABEL_CORNER_CLEARANCE,
	type LabelPlacement,
} from "../../layered/calcLabelPosition";
import { ceilCoordinate } from "../../shared/ceilCoordinate";
import { floorCoordinate } from "../../shared/floorCoordinate";
import { isSameCoordinate } from "../../shared/isSameCoordinate";
import { EDGE_ROUTE_MARGIN } from "../edgeRoutingCosts";

/** How far apart in px the spots a label's centre is tried at along a segment stand. */
const LABEL_STEP = 4;

/** A finished route, and the label to place on it when it has one. */
export type RouteToLabel = {
	/** The whole route, both ends included, each segment running along x or y. */
	path: readonly Point[];
	/** The size in px of the box the label is drawn in; undefined for no label. */
	label: { width: number; height: number } | undefined;
};

/** One spot a label may take, with what decides between spots that cover alike. */
type LabelCandidate = {
	/** The label box's centre. */
	centre: Point;
	/** The segment the label sits on or beside, as an index into the route's segments. */
	segmentIndex: number;
	/** How far along the path from the source the spot on the line lies, in px. */
	distance: number;
	/** Signed px off the line, as `LabelPlacement.offset` reads it; 0 on the line. */
	offset: number;
	isBeside: boolean;
	/** 1 for a spot beside a horizontal segment below it or a vertical one left of it, else 0. */
	sideRank: number;
};

type RouteSegment = {
	start: Point;
	end: Point;
	/** How far along the path from the source it starts, in px. */
	startDistance: number;
	length: number;
	isHorizontal: boolean;
};

const calcOverlapArea = (first: Rect, second: Rect): number =>
	Math.max(
		0,
		Math.min(first.x + first.width, second.x + second.width) -
			Math.max(first.x, second.x),
	) *
	Math.max(
		0,
		Math.min(first.y + first.height, second.y + second.height) -
			Math.max(first.y, second.y),
	);

/** The rect a segment covers: no wider than a line, so only crossing a box counts. */
const toSegmentRect = (start: Point, end: Point): Rect => ({
	x: Math.min(start.x, end.x),
	y: Math.min(start.y, end.y),
	width: Math.abs(end.x - start.x),
	height: Math.abs(end.y - start.y),
});

const toBorderSides = ({ x, y, width, height }: Rect): Rect[] => [
	{ x, y, width, height: 0 },
	{ x, y: y + height, width, height: 0 },
	{ x, y, width: 0, height },
	{ x: x + width, y, width: 0, height },
];

/** Whether a spot's cost is below another's, compared term by term, the first that differs deciding. */
const isCheaper = (
	cost: readonly number[],
	than: readonly number[],
): boolean => {
	for (let index = 0; index < cost.length; index += 1) {
		if (cost[index] !== than[index]) {
			return cost[index] < than[index];
		}
	}
	return false;
};

/**
 * The rect every candidate box for `label` on the route at `path` lies within: the
 * route's bounding box grown by the label's whole extent and LABEL_BESIDE_CLEARANCE
 * on each axis, as far as a box set beside a segment reaches, and 1px more to take in
 * a float's noise.
 */
const calcRouteReach = (
	path: readonly Point[],
	label: { width: number; height: number },
): Rect => {
	const xs = path.map(({ x }) => x);
	const ys = path.map(({ y }) => y);
	const marginX = label.width + LABEL_BESIDE_CLEARANCE + 1;
	const marginY = label.height + LABEL_BESIDE_CLEARANCE + 1;
	const left = Math.min(...xs) - marginX;
	const top = Math.min(...ys) - marginY;
	return {
		x: left,
		y: top,
		width: Math.max(...xs) + marginX - left,
		height: Math.max(...ys) + marginY - top,
	};
};

const listRouteSegments = (path: readonly Point[]): RouteSegment[] => {
	let startDistance = 0;
	return path.slice(1).map((end, index) => {
		const start = path[index];
		const length = calcEuclideanDistance(start.x, start.y, end.x, end.y);
		const segment = {
			start,
			end,
			startDistance,
			length,
			isHorizontal: isSameCoordinate(start.y, end.y),
		};
		startDistance += length;
		return segment;
	});
};

/**
 * The spots a label may take on one route: on each segment whose allowed stretch
 * holds the label clear of the corners, its centre every LABEL_STEP px along the
 * segment from the first whole px the box fits at, and the stretch's midpoint, each on
 * the line and beside it on either side; on a route where no segment holds it, only
 * the two spots beside the midpoint of the longest allowed stretch. A segment's
 * allowed stretch leaves out what lies within EDGE_ROUTE_MARGIN of either end of the
 * route, unless that leaves nothing of any segment.
 */
const listCandidates = (
	segments: readonly RouteSegment[],
	totalLength: number,
	size: { width: number; height: number },
): LabelCandidate[] => {
	const cutStretches = segments.map(({ startDistance, length }) => ({
		from: Math.max(startDistance, EDGE_ROUTE_MARGIN),
		to: Math.min(startDistance + length, totalLength - EDGE_ROUTE_MARGIN),
	}));
	const stretches = cutStretches.some(({ from, to }) => to > from)
		? cutStretches
		: segments.map(({ startDistance, length }) => ({
				from: startDistance,
				to: startDistance + length,
			}));
	const candidates: LabelCandidate[] = [];
	const addSpot = (
		segmentIndex: number,
		distance: number,
		isOnLine: boolean,
	): void => {
		const { start, end, startDistance, length, isHorizontal } =
			segments[segmentIndex];
		const ratio = length === 0 ? 0 : (distance - startDistance) / length;
		const onLine = {
			x: start.x + (end.x - start.x) * ratio,
			y: start.y + (end.y - start.y) * ratio,
		};
		if (isOnLine) {
			candidates.push({
				centre: onLine,
				segmentIndex,
				distance,
				offset: 0,
				isBeside: false,
				sideRank: 0,
			});
		}
		const besideDistance =
			(isHorizontal ? size.height : size.width) / 2 + LABEL_BESIDE_CLEARANCE;
		// The left of the direction of travel, as the canvas sets an offset off.
		const normal =
			length === 0
				? { x: 0, y: 0 }
				: {
						x: -(end.y - start.y) / length,
						y: (end.x - start.x) / length,
					};
		const preferred = isHorizontal ? { x: 0, y: -1 } : { x: 1, y: 0 };
		for (const [sign, sideRank] of [
			[1, 0],
			[-1, 1],
		]) {
			const shift = {
				x: preferred.x * sign * besideDistance,
				y: preferred.y * sign * besideDistance,
			};
			candidates.push({
				centre: { x: onLine.x + shift.x, y: onLine.y + shift.y },
				segmentIndex,
				distance,
				offset: shift.x * normal.x + shift.y * normal.y,
				isBeside: true,
				sideRank,
			});
		}
	};
	segments.forEach(({ start, end, startDistance, isHorizontal }, index) => {
		const { from, to } = stretches[index];
		const halfAlong =
			(isHorizontal ? size.width : size.height) / 2 + LABEL_CORNER_CLEARANCE;
		if (!(to - from >= halfAlong * 2)) {
			return;
		}
		const startAlong = isHorizontal ? start.x : start.y;
		const step =
			(isHorizontal ? end.x - start.x : end.y - start.y) > 0 ? 1 : -1;
		const toAlong = (distance: number): number =>
			startAlong + step * (distance - startDistance);
		const firstAlong = toAlong(from + halfAlong);
		const lastAlong = toAlong(to - halfAlong);
		for (
			let along =
				step > 0 ? ceilCoordinate(firstAlong) : floorCoordinate(firstAlong);
			(along - lastAlong) * step <= 0 || isSameCoordinate(along, lastAlong);
			along += step * LABEL_STEP
		) {
			addSpot(index, startDistance + step * (along - startAlong), true);
		}
		addSpot(index, (from + to) / 2, true);
	});
	if (candidates.length === 0) {
		let longest = 0;
		stretches.forEach(({ from, to }, index) => {
			if (to - from > stretches[longest].to - stretches[longest].from) {
				longest = index;
			}
		});
		const { from, to } = stretches[longest];
		addSpot(longest, (from + to) / 2, false);
	}
	return candidates;
};

/**
 * Where each route's label goes, the labels placed one by one in the order given,
 * each keeping off the ones before it. Among the spots listCandidates offers, the one
 * whose box covers, in order of weight, the least area of `shapes`, the fewest labels
 * already placed, the fewest route segments (every other route's, and its own but the
 * one it sits on or beside), and the fewest sides of `borders`; then a spot on the
 * line over one beside it, the one nearest the route's middle along the path, the one
 * nearer the source, and above a horizontal segment or right of a vertical one. Only
 * passing through a box's inside counts: touching its edge does not.
 *
 * @param routes - The finished routes, the ones without a label included, whose
 *   segments the labels keep off as well
 * @param shapes - Boxes, captions and other rects a label keeps off, the label's own
 *   ends included, in the routes' coordinates
 * @param borders - Frames whose outline a label keeps off; the inside is free
 * @returns The placement for each route with a label, by its index; undefined for one
 *   with none
 */
export const placeRouteLabels = (
	routes: readonly RouteToLabel[],
	shapes: readonly Rect[],
	borders: readonly Rect[],
): (LabelPlacement | undefined)[] => {
	const segmentsByRoute = routes.map(({ path }) => listRouteSegments(path));
	const segmentRects = segmentsByRoute.flatMap((segments, routeIndex) =>
		segments.map(({ start, end }, segmentIndex) => ({
			rect: toSegmentRect(start, end),
			routeIndex,
			segmentIndex,
		})),
	);
	const borderSides = borders.flatMap(toBorderSides);
	const placedBoxes: Rect[] = [];
	return routes.map(({ path, label }, routeIndex) => {
		if (label === undefined) {
			return undefined;
		}
		const segments = segmentsByRoute[routeIndex];
		const totalLength = segments.reduce((sum, { length }) => sum + length, 0);
		const toBox = ({ centre }: LabelCandidate): Rect => ({
			x: centre.x - label.width / 2,
			y: centre.y - label.height / 2,
			width: label.width,
			height: label.height,
		});
		const reach = calcRouteReach(path, label);
		const nearShapes = shapes.filter((shape) => doRectsOverlap(reach, shape));
		const nearPlaced = placedBoxes.filter((placed) =>
			doRectsOverlap(reach, placed),
		);
		const nearSegments = segmentRects.filter((segment) =>
			doRectsOverlap(reach, segment.rect),
		);
		const nearBorderSides = borderSides.filter((side) =>
			doRectsOverlap(reach, side),
		);
		let best: LabelCandidate | undefined;
		let bestCost: number[] = [];
		const cost: number[] = [];
		for (const candidate of listCandidates(segments, totalLength, label)) {
			const box = toBox(candidate);
			let coveredArea = 0;
			for (const shape of nearShapes) {
				coveredArea += calcOverlapArea(box, shape);
			}
			if (best !== undefined && coveredArea > bestCost[0]) {
				continue;
			}
			let placedCount = 0;
			for (const placed of nearPlaced) {
				if (doRectsOverlap(box, placed)) {
					placedCount += 1;
				}
			}
			let segmentCount = 0;
			for (const segment of nearSegments) {
				if (
					!(
						segment.routeIndex === routeIndex &&
						segment.segmentIndex === candidate.segmentIndex
					) &&
					doRectsOverlap(box, segment.rect)
				) {
					segmentCount += 1;
				}
			}
			let borderCount = 0;
			for (const side of nearBorderSides) {
				if (doRectsOverlap(box, side)) {
					borderCount += 1;
				}
			}
			cost[0] = coveredArea;
			cost[1] = placedCount;
			cost[2] = segmentCount;
			cost[3] = borderCount;
			cost[4] = candidate.isBeside ? 1 : 0;
			cost[5] = Math.abs(candidate.distance - totalLength / 2);
			cost[6] = candidate.distance;
			cost[7] = candidate.sideRank;
			if (best === undefined || isCheaper(cost, bestCost)) {
				best = candidate;
				bestCost = [...cost];
			}
		}
		const chosen = best as LabelCandidate;
		placedBoxes.push(toBox(chosen));
		return {
			position: totalLength === 0 ? 0 : chosen.distance / totalLength,
			offset: chosen.offset,
		};
	});
};
