import type { LayoutAnchorRange, LayoutGraphNode, LayoutSide } from "./types";

/** A side usable from end to end: what a side with no declared range offers. */
export const FULL_ANCHOR_RANGE: LayoutAnchorRange = { min: 0, max: 1 };

/** The usable stretch of one side of a node, end to end where it declares none. */
export const readAnchorRange = (
	anchorRanges: LayoutGraphNode["anchorRanges"],
	side: LayoutSide,
): LayoutAnchorRange => anchorRanges?.[side] ?? FULL_ANCHOR_RANGE;

export const calcAnchorRangeMidpoint = (range: LayoutAnchorRange): number =>
	(range.min + range.max) / 2;

/**
 * `share` (a stretch given as ratios of a whole side) taken as ratios of `range`
 * instead, so a rule written for the whole side applies to its usable part.
 */
export const scaleIntoAnchorRange = (
	range: LayoutAnchorRange,
	share: LayoutAnchorRange,
): LayoutAnchorRange => {
	const length = range.max - range.min;
	return {
		min: range.min + length * share.min,
		max: range.min + length * share.max,
	};
};

/** The overlap of two stretches; `min > max` when they do not meet. */
export const intersectAnchorRanges = (
	first: LayoutAnchorRange,
	second: LayoutAnchorRange,
): LayoutAnchorRange => ({
	min: Math.max(first.min, second.min),
	max: Math.min(first.max, second.max),
});
