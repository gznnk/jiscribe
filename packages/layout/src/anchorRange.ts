import type { LayoutAnchorRange, LayoutSide } from "./types";

/** A side usable from end to end: what a side with no declared range offers. */
export const FULL_ANCHOR_RANGE: LayoutAnchorRange = { min: 0, max: 1 };

/**
 * The stretch `ranges` (a node's `anchorRanges` or `anchorBodyRanges`) gives one side,
 * end to end where it gives none.
 */
export const readAnchorRange = (
	ranges: Partial<Record<LayoutSide, LayoutAnchorRange>> | undefined,
	side: LayoutSide,
): LayoutAnchorRange => ranges?.[side] ?? FULL_ANCHOR_RANGE;

export const calcAnchorRangeMidpoint = (range: LayoutAnchorRange): number =>
	(range.min + range.max) / 2;

/** Whether `range` holds `ratio`, its ends included. */
export const isWithinAnchorRange = (
	ratio: number,
	range: LayoutAnchorRange,
): boolean => ratio >= range.min && ratio <= range.max;

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

/**
 * `preferred` where `usable` holds it, ends included, so a position already on the
 * outline stays put; else the middle of `usable`.
 */
const pickRatioInAnchorRange = (
	preferred: number,
	usable: LayoutAnchorRange,
): number =>
	isWithinAnchorRange(preferred, usable)
		? preferred
		: calcAnchorRangeMidpoint(usable);

/**
 * Where a side's only end sits: the middle of `body` (the side's body, see
 * `LayoutGraphNode.anchorBodyRanges`), or the middle of `usable` when the body's
 * middle is not on the outline.
 */
export const calcCentredAnchorRatio = (
	body: LayoutAnchorRange,
	usable: LayoutAnchorRange,
): number => pickRatioInAnchorRange(calcAnchorRangeMidpoint(body), usable);

/**
 * `share` taken as ratios of `body` (the side's body), cut down to the part of it
 * `usable` holds; the same share of `usable` instead when the two do not meet.
 */
export const scaleIntoBodyWithinUsable = (
	body: LayoutAnchorRange,
	usable: LayoutAnchorRange,
	share: LayoutAnchorRange,
): LayoutAnchorRange => {
	const overlap = intersectAnchorRanges(
		scaleIntoAnchorRange(body, share),
		usable,
	);
	return overlap.min <= overlap.max
		? overlap
		: scaleIntoAnchorRange(usable, share);
};
