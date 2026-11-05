import type { Dimensions, Rect } from "@jiscribe/geometry";

import { calcLocalAnchorRegion } from "./localAnchorRay";
import type { EdgeAnchorSide } from "../types/EndpointRef";

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
