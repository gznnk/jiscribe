import type { Point, Rect } from "@jiscribe/geometry";

import { calcPositionAlongPath } from "./calcPositionAlongPath";
import { isSameCoordinate } from "./isSameCoordinate";
import { createLayoutAxis } from "./LayoutAxis";
import type { LayoutDirection } from "./LayoutDirection";

/** Room kept between a label's box and the nearest corner of its own route, in px. */
export const LABEL_CORNER_CLEARANCE = 8;

/** Room kept between a label set beside its line and the line itself, in px. */
export const LABEL_BESIDE_CLEARANCE = 6;

/** Where a label sits relative to its route, in the terms a connector label stores. */
export type LabelPlacement = {
	/** 0 at the route's start, 1 at its end. */
	position: number;
	/** Signed distance from the line, in px; 0 puts the label on it. */
	offset: number;
};

type Segment = {
	start: Point;
	end: Point;
	length: number;
	isHorizontal: boolean;
};

/** How far in px a route runs from each of its ends before it leaves its own node's visual margin. */
export type OwnMarginLengths = { start: number; end: number };

/**
 * The segment with `fromStart` px cut off its start and `fromEnd` off its end, along
 * the segment; undefined when nothing is left of it.
 */
const cutSegment = (
	segment: Segment,
	fromStart: number,
	fromEnd: number,
): Segment | undefined => {
	if (fromStart === 0 && fromEnd === 0) {
		return segment;
	}
	const length = segment.length - fromStart - fromEnd;
	if (length <= 0) {
		return undefined;
	}
	const { start, end } = segment;
	const pointAt = (distance: number): Point => ({
		x: start.x + ((end.x - start.x) * distance) / segment.length,
		y: start.y + ((end.y - start.y) * distance) / segment.length,
	});
	return {
		start: pointAt(fromStart),
		end: pointAt(segment.length - fromEnd),
		length,
		isHorizontal: segment.isHorizontal,
	};
};

/**
 * Where a right-angled route's label goes, so that its box never covers a corner of
 * the route (the box knocks the line out behind it, and a corner half hidden reads
 * as a line gone thin). In order of preference: on the run through the gap dagre
 * kept the label in, level with where dagre put it; else on the longest segment
 * that can hold it; else beside the longest segment there is. Where an end runs
 * through its own node's visual margin is no spot for it: that stretch counts as no
 * part of the route, unless it is the whole of it.
 *
 * @param path - The whole route, both ends included
 * @param labelPoint - Where dagre centred the label, in the same frame as `path`
 * @param labelSize - The label box; a horizontal segment has to hold its width and a
 *   vertical one its height, each plus {@link LABEL_CORNER_CLEARANCE} on both sides
 * @param direction - Decides which axis is the rank axis
 * @param rankSpacing - Width of a gap in px; a run further than this from the label
 *   lies in another gap and is not the label's
 * @param obstacles - Boxes the label's own box must not touch (the two it joins); a
 *   spot that would is passed over for the next
 * @param ownMarginLengths - How far the route runs from each end through its own
 *   node's visual margin, 0 for an end with none; cut off the first and last segments
 */
export const calcLabelPosition = (
	path: readonly Point[],
	labelPoint: Point,
	labelSize: { width: number; height: number },
	direction: LayoutDirection,
	rankSpacing: number,
	obstacles: readonly Rect[] = [],
	ownMarginLengths: OwnMarginLengths = { start: 0, end: 0 },
): LabelPlacement => {
	const axis = createLayoutAxis(direction);
	const wholeSegments: Segment[] = path.slice(1).map((end, index) => {
		const start = path[index];
		return {
			start,
			end,
			length: Math.abs(end.x - start.x) + Math.abs(end.y - start.y),
			isHorizontal: isSameCoordinate(start.y, end.y),
		};
	});
	const cutSegments =
		ownMarginLengths.start === 0 && ownMarginLengths.end === 0
			? wholeSegments
			: wholeSegments.flatMap((segment, index) => {
					const cut = cutSegment(
						segment,
						index === 0 ? ownMarginLengths.start : 0,
						index === wholeSegments.length - 1 ? ownMarginLengths.end : 0,
					);
					return cut === undefined ? [] : [cut];
				});
	const segments = cutSegments.length > 0 ? cutSegments : wholeSegments;
	const extentAlong = (segment: Segment): number =>
		segment.isHorizontal ? labelSize.width : labelSize.height;
	const holds = (segment: Segment): boolean =>
		segment.length >= extentAlong(segment) + 2 * LABEL_CORNER_CLEARANCE;
	const onLine = (point: Point): LabelPlacement => ({
		position: calcPositionAlongPath(path, point),
		offset: 0,
	});
	const isClearOfObstacles = (centre: Point): boolean =>
		obstacles.every(
			(box) =>
				centre.x + labelSize.width / 2 <= box.x ||
				centre.x - labelSize.width / 2 >= box.x + box.width ||
				centre.y + labelSize.height / 2 <= box.y ||
				centre.y - labelSize.height / 2 >= box.y + box.height,
		);

	// 1. The run through the label's own gap, level with dagre's spot.
	let gapRun: Segment | undefined;
	let gapDistance = rankSpacing;
	for (const segment of segments) {
		const isSidewaysRun =
			isSameCoordinate(axis.along(segment.start), axis.along(segment.end)) &&
			segment.length > 0;
		const distance = Math.abs(
			axis.along(segment.start) - axis.along(labelPoint),
		);
		if (isSidewaysRun && distance < gapDistance) {
			gapRun = segment;
			gapDistance = distance;
		}
	}
	if (gapRun !== undefined && holds(gapRun)) {
		const inset = extentAlong(gapRun) / 2 + LABEL_CORNER_CLEARANCE;
		const clampAcross = (value: number, a: number, b: number): number =>
			Math.min(Math.max(a, b) - inset, Math.max(Math.min(a, b) + inset, value));
		const spot = gapRun.isHorizontal
			? {
					x: clampAcross(labelPoint.x, gapRun.start.x, gapRun.end.x),
					y: gapRun.start.y,
				}
			: {
					x: gapRun.start.x,
					y: clampAcross(labelPoint.y, gapRun.start.y, gapRun.end.y),
				};
		if (isClearOfObstacles(spot)) {
			return onLine(spot);
		}
	}

	// 2. The longest segment that can hold the label clear of the boxes, at its midpoint.
	const longestFirst = [...segments].sort((a, b) => b.length - a.length);
	const midpointOf = (segment: Segment): Point => ({
		x: (segment.start.x + segment.end.x) / 2,
		y: (segment.start.y + segment.end.y) / 2,
	});
	const holding = longestFirst.find(
		(segment) => holds(segment) && isClearOfObstacles(midpointOf(segment)),
	);
	if (holding !== undefined) {
		return onLine(midpointOf(holding));
	}

	// 3. Beside the longest segment, so the box leaves the line alone.
	const longest = longestFirst[0];
	return {
		position: calcPositionAlongPath(path, midpointOf(longest)),
		offset:
			(longest.isHorizontal ? labelSize.height : labelSize.width) / 2 +
			LABEL_BESIDE_CLEARANCE,
	};
};
