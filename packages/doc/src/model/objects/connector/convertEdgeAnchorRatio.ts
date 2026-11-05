import type { Dimensions, Rect } from "@jiscribe/geometry";

import { calcLocalAnchorRegion } from "./localAnchorRay";
import { EdgeAnchorSides, type EdgeAnchorSide } from "../types/EndpointRef";

/** A stretch of one side, as ratios of the bounding box's side: 0 at its start, 1 at its end. */
export type EdgeAnchorRange = { min: number; max: number };

/** The along-side start and length of a rect's side, in local coordinates. */
const readSideSpan = (
	rect: Rect,
	side: EdgeAnchorSide,
): { start: number; length: number } =>
	side === "top" || side === "bottom"
		? { start: rect.x, length: rect.width }
		: { start: rect.y, length: rect.height };

const clampUnit = (ratio: number): number => Math.min(1, Math.max(0, ratio));

/**
 * An edge anchor's position given as a ratio of the bounding box's side (how an
 * automatic layout measures it) as the ratio of the anchor region's side an
 * `EdgeAnchorSpec` stores, so the anchor is drawn at the same point.
 *
 * @param boxRatio - Ratio of the bounding box's side, 0 at its start
 * @param side - Which local side both ratios run along
 * @param dimensions - The shape's untransformed box
 * @param anchorRegion - What the type's `anchorRegion` answered; undefined, or a
 *   rect the canvas would fall back from (see calcLocalAnchorRegion), leaves the
 *   ratio as it is
 * @returns The ratio of the region's side, held to 0..1 so a point beyond the
 *   region lands on its nearer end; 0.5 for a region with no extent on that side
 */
export const convertBoxRatioToAnchorRegionRatio = (
	boxRatio: number,
	side: EdgeAnchorSide,
	dimensions: Dimensions,
	anchorRegion: Rect | undefined,
): number => {
	if (anchorRegion === undefined) {
		return boxRatio;
	}
	const box = readSideSpan(calcLocalAnchorRegion(dimensions), side);
	const region = readSideSpan(
		calcLocalAnchorRegion(dimensions, anchorRegion),
		side,
	);
	if (!(region.length > 0)) {
		return 0.5;
	}
	const along = box.start + box.length * boxRatio;
	return clampUnit((along - region.start) / region.length);
};

/**
 * The inverse of {@link convertBoxRatioToAnchorRegionRatio}: a stored edge
 * anchor's ratio of the anchor region's side as a ratio of the bounding box's.
 *
 * @param regionRatio - Ratio of the anchor region's side, as an `EdgeAnchorSpec` stores it
 * @param side - Which local side both ratios run along
 * @param dimensions - The shape's untransformed box
 * @param anchorRegion - What the type's `anchorRegion` answered; undefined, or a
 *   rect the canvas would fall back from, leaves the ratio as it is
 * @returns The ratio of the box's side; 0.5 for a box with no extent on that side
 */
export const convertAnchorRegionRatioToBoxRatio = (
	regionRatio: number,
	side: EdgeAnchorSide,
	dimensions: Dimensions,
	anchorRegion: Rect | undefined,
): number => {
	if (anchorRegion === undefined) {
		return regionRatio;
	}
	const box = readSideSpan(calcLocalAnchorRegion(dimensions), side);
	const region = readSideSpan(
		calcLocalAnchorRegion(dimensions, anchorRegion),
		side,
	);
	if (!(box.length > 0)) {
		return 0.5;
	}
	const along = region.start + region.length * regionRatio;
	return (along - box.start) / box.length;
};

/**
 * The stretch of one side the anchor region covers (the shape's body there, a loop
 * limit's left side below its cut corners): where the region's ratios 0 and 1 fall
 * on the bounding box's side, by {@link convertAnchorRegionRatioToBoxRatio}.
 *
 * @param shape - The shape's untransformed box and resolved anchor region
 * @param side - Which local side of the bounding box
 * @returns The stretch as ratios of the bounding box's side, each end held to 0..1.
 *   0..1 for a shape declaring no anchor region, for a region the canvas falls back
 *   from (see calcLocalAnchorRegion), and when the box has no extent on that side
 */
export const calcAnchorRegionBodyRange = (
	shape: SideScaleShape,
	side: EdgeAnchorSide,
): EdgeAnchorRange => {
	const extent = readSideSpan(calcLocalAnchorRegion(shape), side).length;
	if (!(extent > 0) || !Number.isFinite(extent)) {
		return { min: 0, max: 1 };
	}
	const toBoxRatio = (regionRatio: number): number =>
		clampUnit(
			convertAnchorRegionRatioToBoxRatio(
				regionRatio,
				side,
				shape,
				shape.anchorRegion,
			),
		);
	return { min: toBoxRatio(0), max: toBoxRatio(1) };
};

/**
 * {@link calcAnchorRegionBodyRange} for each of the four sides.
 *
 * @param shape - As for calcAnchorRegionBodyRange
 * @returns One stretch per side, keyed by the side
 */
export const calcAnchorRegionBodyRanges = (
	shape: SideScaleShape,
): Record<EdgeAnchorSide, EdgeAnchorRange> => {
	const bodyRanges = {} as Record<EdgeAnchorSide, EdgeAnchorRange>;
	for (const side of EdgeAnchorSides) {
		bodyRanges[side] = calcAnchorRegionBodyRange(shape, side);
	}
	return bodyRanges;
};

/** A position along one side, as a layout anchor and a stored end both carry it. */
type SidePosition = { side: EdgeAnchorSide; t: number };

/** The shape an end is converted on: its untransformed box and the anchor region its type answered. */
type SideScaleShape = Dimensions & { anchorRegion: Rect | undefined };

/**
 * {@link convertBoxRatioToAnchorRegionRatio} on a whole end: an automatic layout's
 * anchor as the edge anchor the document stores.
 *
 * @param position - The end, its `t` a ratio of the box's side; every other field is kept
 * @param shape - The owner's untransformed box and resolved anchor region
 */
export const toAnchorRegionSidePosition = <TPosition extends SidePosition>(
	position: TPosition,
	shape: SideScaleShape,
): TPosition => ({
	...position,
	t: convertBoxRatioToAnchorRegionRatio(
		position.t,
		position.side,
		shape,
		shape.anchorRegion,
	),
});

/**
 * {@link convertAnchorRegionRatioToBoxRatio} on a whole end: a stored edge anchor
 * as an automatic layout measures it.
 *
 * @param position - The end, its `t` a ratio of the anchor region's side; every other field is kept
 * @param shape - The owner's untransformed box and resolved anchor region
 */
export const toBoxSidePosition = <TPosition extends SidePosition>(
	position: TPosition,
	shape: SideScaleShape,
): TPosition => ({
	...position,
	t: convertAnchorRegionRatioToBoxRatio(
		position.t,
		position.side,
		shape,
		shape.anchorRegion,
	),
});
