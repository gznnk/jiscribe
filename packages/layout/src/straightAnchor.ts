import type { Rect } from "@jiscribe/geometry";

import { intersectAnchorRanges, isWithinAnchorRange } from "./anchorRange";
import type { LayoutAxis } from "./LayoutAxis";
import type { LayoutAnchorRange } from "./types";

/**
 * How far along a side an anchor may sit when it puts the edge straight on the column
 * it travels in, so a short jog in the gap is traded for a line near the corner. As
 * ratios of the whole side, taken together with the side's usable stretch
 * (`LayoutGraphNode.anchorRanges`): both must hold the column.
 */
export const EDGE_ANCHOR_STRAIGHT_RANGE = { min: 0.05, max: 0.95 } as const;

/** Where `column` (a coordinate across the rank axis) falls along the box's side, 0..1. */
export const calcSideRatio = (
	bounds: Rect,
	column: number,
	axis: LayoutAxis,
): number => (column - axis.acrossStart(bounds)) / axis.acrossExtent(bounds);

/** The column (a coordinate across the rank axis) at `ratio` along the box's side. */
export const columnAt = (
	bounds: Rect,
	ratio: number,
	axis: LayoutAxis,
): number => axis.acrossStart(bounds) + ratio * axis.acrossExtent(bounds);

/** Whether an end at `ratio` lets its edge leave straight, inside the side's usable stretch. */
export const isStraightRatio = (
	ratio: number,
	usable: Readonly<LayoutAnchorRange>,
): boolean =>
	isWithinAnchorRange(
		ratio,
		intersectAnchorRanges(EDGE_ANCHOR_STRAIGHT_RANGE, usable),
	);

/**
 * Where on the box's side an end sits to run straight along `column` (a coordinate
 * across `axis`), when that is a place it may leave straight from (see
 * isStraightRatio): what puts one end of an edge in line with an end the other box
 * already has.
 *
 * @param usable - The side's usable stretch (`LayoutGraphNode.anchorRanges`)
 * @returns The ratio along the side, or undefined when the column misses that stretch
 */
export const calcStraightAnchorRatio = (
	bounds: Rect,
	column: number,
	usable: Readonly<LayoutAnchorRange>,
	axis: LayoutAxis,
): number | undefined => {
	const ratio = calcSideRatio(bounds, column, axis);
	return isStraightRatio(ratio, usable) ? ratio : undefined;
};
