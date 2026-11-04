import type { Point, Rect } from "@jiscribe/geometry";

import { calcPositionAlongPath } from "./calcPositionAlongPath";
import { isSameCoordinate } from "./isSameCoordinate";
import { type LayoutDirection, isVerticalFlow } from "./LayoutDirection";

/** Room kept between a label's box and the nearest corner of its own route, in px. */
const LABEL_CORNER_CLEARANCE = 8;

/** Room kept between a label set beside its line and the line itself, in px. */
const LABEL_BESIDE_CLEARANCE = 6;

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

/**
 * Where a right-angled route's label goes, so that its box never covers a corner of
 * the route (the box knocks the line out behind it, and a corner half hidden reads
 * as a line gone thin). In order of preference: on the run through the gap dagre
 * kept the label in, level with where dagre put it; else on the longest segment
 * that can hold it; else beside the longest segment there is.
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
 */
export const calcLabelPosition = (
	path: readonly Point[],
	labelPoint: Point,
	labelSize: { width: number; height: number },
	direction: LayoutDirection,
	rankSpacing: number,
	obstacles: readonly Rect[] = [],
): LabelPlacement => {
	const vertical = isVerticalFlow(direction);
	const along = (point: Point): number => (vertical ? point.y : point.x);
	const segments: Segment[] = path.slice(1).map((end, index) => {
		const start = path[index];
		return {
			start,
			end,
			length: Math.abs(end.x - start.x) + Math.abs(end.y - start.y),
			isHorizontal: isSameCoordinate(start.y, end.y),
		};
	});
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
			isSameCoordinate(along(segment.start), along(segment.end)) &&
			segment.length > 0;
		const distance = Math.abs(along(segment.start) - along(labelPoint));
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
