import {
	castRayOnPolygon,
	isPointInPolygon,
	type Point,
	type Rect,
} from "@jiscribe/geometry";

import {
	EDGE_LOCAL_DIRECTIONS,
	calcLocalAnchorRegion,
	calcRegionCenter,
} from "./localAnchorRay";
import { EdgeAnchorSides, type EdgeAnchorSide } from "../types/EndpointRef";
import type { GeometryType } from "../types/GeometryType";

/** A stretch of one side, as ratios of the bounding box's side: 0 at its start, 1 at its end. */
export type EdgeAnchorRange = { min: number; max: number };

/** What {@link calcEdgeAnchorOutlineRange} reads of a shape, every declaration already resolved. */
export type EdgeAnchorOutlineShape = {
	/** Untransformed width of the bounding box. */
	width: number;
	/** Untransformed height of the bounding box. */
	height: number;
	/** The type's `features.geometry`; undefined reads as a rectangle. */
	geometry: GeometryType | undefined;
	/** What the type's `outline` answered, in local centered coordinates; undefined for a type declaring none. */
	outline: readonly Point[] | undefined;
	/** What the type's `anchorRegion` answered, in the same space; undefined for a type declaring none. */
	anchorRegion: Rect | undefined;
};

const FULL_RANGE: EdgeAnchorRange = { min: 0, max: 1 };

const isAcrossX = (side: EdgeAnchorSide): boolean =>
	side === "top" || side === "bottom";

/** The point an edge anchor's ray starts from, for a ratio of the bounding box's side. */
const calcBoxRatioOrigin = (
	shape: EdgeAnchorOutlineShape,
	side: EdgeAnchorSide,
	crossCoordinate: number,
	ratio: number,
): Point =>
	isAcrossX(side)
		? { x: -shape.width / 2 + shape.width * ratio, y: crossCoordinate }
		: { x: crossCoordinate, y: -shape.height / 2 + shape.height * ratio };

/**
 * The ratios at which the line the rays start on meets the polygon's edges: where
 * being inside can change. An edge lying on the line contributes both its ends.
 */
const listCrossingRatios = (
	shape: EdgeAnchorOutlineShape,
	side: EdgeAnchorSide,
	crossCoordinate: number,
	outline: readonly Point[],
): number[] => {
	const acrossX = isAcrossX(side);
	const extent = acrossX ? shape.width : shape.height;
	const toRatio = (along: number): number => along / extent + 0.5;
	const ratios: number[] = [];
	for (let index = 0; index < outline.length; index += 1) {
		const start = outline[index];
		const end = outline[(index + 1) % outline.length];
		const startCross = acrossX ? start.y : start.x;
		const endCross = acrossX ? end.y : end.x;
		const startAlong = acrossX ? start.x : start.y;
		const endAlong = acrossX ? end.x : end.y;
		if (startCross === endCross) {
			if (startCross === crossCoordinate) {
				ratios.push(toRatio(startAlong), toRatio(endAlong));
			}
			continue;
		}
		const share = (crossCoordinate - startCross) / (endCross - startCross);
		if (share >= 0 && share <= 1) {
			ratios.push(toRatio(startAlong + (endAlong - startAlong) * share));
		}
	}
	return ratios;
};

/**
 * The stretches of the line where a ray starting on it is inside the polygon and
 * leaves it, ends included, merged where they touch.
 */
const listInsideRanges = (
	shape: EdgeAnchorOutlineShape,
	side: EdgeAnchorSide,
	crossCoordinate: number,
	outline: readonly Point[],
): EdgeAnchorRange[] => {
	const breaks = [
		0,
		1,
		...listCrossingRatios(shape, side, crossCoordinate, outline).filter(
			(ratio) => ratio > 0 && ratio < 1,
		),
	].sort((a, b) => a - b);
	const direction = EDGE_LOCAL_DIRECTIONS[side];
	const ranges: EdgeAnchorRange[] = [];
	for (let index = 1; index < breaks.length; index += 1) {
		const min = breaks[index - 1];
		const max = breaks[index];
		if (max <= min) {
			continue;
		}
		// Between two crossings the answer is the same throughout, so the middle decides.
		const origin = calcBoxRatioOrigin(
			shape,
			side,
			crossCoordinate,
			(min + max) / 2,
		);
		const leavesOutline =
			isPointInPolygon(origin, outline) &&
			castRayOnPolygon(
				outline,
				origin.x,
				origin.y,
				direction.x,
				direction.y,
			) !== null;
		if (!leavesOutline) {
			continue;
		}
		const previous = ranges[ranges.length - 1];
		if (previous !== undefined && previous.max === min) {
			previous.max = max;
		} else {
			ranges.push({ min, max });
		}
	}
	return ranges;
};

/** The range holding the side's midpoint, or the longest when none does. */
const pickMainRange = (
	ranges: readonly EdgeAnchorRange[],
): EdgeAnchorRange | undefined => {
	const holdingMidpoint = ranges.find(
		({ min, max }) => min <= 0.5 && max >= 0.5,
	);
	if (holdingMidpoint !== undefined) {
		return holdingMidpoint;
	}
	let longest: EdgeAnchorRange | undefined;
	for (const range of ranges) {
		if (
			longest === undefined ||
			range.max - range.min > longest.max - longest.min
		) {
			longest = range;
		}
	}
	return longest;
};

/**
 * Where the rays start inside the ellipse the box implies: the chord the line cuts,
 * which as a share of the side depends on how far off center the line runs alone.
 */
const calcEllipseInsideRange = (
	shape: EdgeAnchorOutlineShape,
	side: EdgeAnchorSide,
	crossCoordinate: number,
): EdgeAnchorRange | undefined => {
	const crossRadius = (isAcrossX(side) ? shape.height : shape.width) / 2;
	const crossShare = crossCoordinate / crossRadius;
	if (!(crossShare >= -1 && crossShare <= 1)) {
		return undefined;
	}
	const halfChordShare = Math.sqrt(1 - crossShare * crossShare) / 2;
	return { min: 0.5 - halfChordShare, max: 0.5 + halfChordShare };
};

/** The stretch of the side the anchor region spans, as ratios of the box's side, held to 0..1. */
const calcRegionCoverage = (
	shape: EdgeAnchorOutlineShape,
	side: EdgeAnchorSide,
	region: Rect,
): EdgeAnchorRange => {
	const acrossX = isAcrossX(side);
	const extent = acrossX ? shape.width : shape.height;
	const start = acrossX ? region.x : region.y;
	const length = acrossX ? region.width : region.height;
	return {
		min: Math.min(1, Math.max(0, start / extent + 0.5)),
		max: Math.min(1, Math.max(0, (start + length) / extent + 0.5)),
	};
};

/**
 * Where along one side an edge anchor ends on the drawn outline: the ratios
 * whose ray starts inside the outline and leaves it, as opposed to one that
 * starts outside and lands on the outline from without (a parallelogram's bottom
 * near its left end, whose ray meets the slanted side from outside and so would
 * draw the line through the shape). The ray's direction does not matter: one
 * leaving through a slanted side counts.
 *
 * The ratio is of the bounding box's side, which is how an automatic layout
 * measures it; an edge anchor stores one of the anchor region's side instead
 * (see {@link import("./convertEdgeAnchorRatio").convertBoxRatioToAnchorRegionRatio}).
 * Rays start on the anchor region's center line, as the canvas casts them
 * (see calcEdgeAnchorLocalOrigin), and the range never runs past the stretch the
 * region spans, so it converts into the region's ratio without leaving 0..1.
 *
 * Pure geometry on resolved values: the caller looks the declarations up and
 * calls them, so the doc layer and the canvas reach the same answer from a doc
 * and a state alike. The shape's transform is not read; a caller laying out a
 * rotated or flipped shape by its box has no use for the answer.
 *
 * @param shape - The shape's box and its resolved outline, anchor region and
 *   geometry. With no outline, a `"ellipse"` geometry is read as the ellipse its
 *   box implies and any other as the box itself
 * @param side - Which local side of the bounding box
 * @returns The range as ratios of the bounding box's side, with `min <= max`. An
 *   origin on the outline counts as inside, so the ends are on it. Where the
 *   outline splits the line into several stretches (a concave silhouette), the one
 *   holding the midpoint, else the longest. 0..1 when the box has no extent on that
 *   side, when no ray leaves the outline, and for an ellipse cut through its
 *   center; the region's own stretch when the outline's and the region's do not
 *   overlap
 */
export const calcEdgeAnchorOutlineRange = (
	shape: EdgeAnchorOutlineShape,
	side: EdgeAnchorSide,
): EdgeAnchorRange => {
	const extent = isAcrossX(side) ? shape.width : shape.height;
	if (!(extent > 0) || !Number.isFinite(extent)) {
		return FULL_RANGE;
	}
	const region = calcLocalAnchorRegion(shape, shape.anchorRegion);
	const center = calcRegionCenter(region);
	const crossCoordinate = isAcrossX(side) ? center.y : center.x;

	let insideRange: EdgeAnchorRange | undefined;
	if (shape.outline !== undefined && shape.outline.length >= 3) {
		insideRange = pickMainRange(
			listInsideRanges(shape, side, crossCoordinate, shape.outline),
		);
	} else if (shape.geometry === "ellipse") {
		insideRange = calcEllipseInsideRange(shape, side, crossCoordinate);
	}
	const outlineRange = insideRange ?? FULL_RANGE;

	if (shape.anchorRegion === undefined) {
		return { ...outlineRange };
	}
	const coverage = calcRegionCoverage(shape, side, region);
	const min = Math.max(outlineRange.min, coverage.min);
	const max = Math.min(outlineRange.max, coverage.max);
	return min <= max ? { min, max } : coverage;
};

/**
 * {@link calcEdgeAnchorOutlineRange} for each of the four sides.
 *
 * @param shape - As for calcEdgeAnchorOutlineRange
 * @returns One range per side, keyed by the side
 */
export const calcEdgeAnchorOutlineRanges = (
	shape: EdgeAnchorOutlineShape,
): Record<EdgeAnchorSide, EdgeAnchorRange> => {
	const ranges = {} as Record<EdgeAnchorSide, EdgeAnchorRange>;
	for (const side of EdgeAnchorSides) {
		ranges[side] = calcEdgeAnchorOutlineRange(shape, side);
	}
	return ranges;
};
