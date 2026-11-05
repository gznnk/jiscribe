// The transform-free half of resolving an anchor on a shape: where its ray starts
// and where it leaves the drawn outline, both in the shape's local, centered,
// untransformed coordinates. The canvas carries the landing through the shape's
// transform to draw it; the doc layer's layout reads the same answers to keep its
// edge anchors on the outline, so the two cannot disagree about either.
import {
	calcOutlinePointAlongLocalRayForRotatedEllipse,
	castRayOnPolygon,
	type Dimensions,
	type Point,
	type Rect,
} from "@jiscribe/geometry";

import type { EdgeAnchorSide, EdgeAnchorSpec } from "../types/EndpointRef";
import type { GeometryType } from "../types/GeometryType";

/** Outward direction of each local bounding-box edge in the shape's local space. */
export const EDGE_LOCAL_DIRECTIONS: Readonly<Record<EdgeAnchorSide, Point>> = {
	top: { x: 0, y: -1 },
	right: { x: 1, y: 0 },
	bottom: { x: 0, y: 1 },
	left: { x: -1, y: 0 },
};

/**
 * An edge anchor's ratio held to 0..1.
 *
 * @param t - The stored ratio; a non-finite one reads as the edge midpoint (0.5)
 */
export const clampAnchorRatio = (t: number): number => {
	if (!Number.isFinite(t)) {
		return 0.5;
	}
	return Math.min(1, Math.max(0, t));
};

/**
 * The anchor region in local, centered coordinates, falling back to the full
 * bounding box. Regions come from plugin calculators, several of which divide by
 * the shape size, so a degenerate shape can hand one back with NaN fields —
 * fall back rather than let it poison the coordinates derived from it.
 *
 * @param dimensions - The shape's untransformed box, which the fallback spans
 * @param anchorRegion - What the type's `anchorRegion` answered; undefined, null
 *   or a rect with any non-finite field falls back to the box
 */
export const calcLocalAnchorRegion = (
	dimensions: Dimensions,
	anchorRegion?: Rect | null,
): Rect => {
	if (
		anchorRegion &&
		Number.isFinite(anchorRegion.x) &&
		Number.isFinite(anchorRegion.y) &&
		Number.isFinite(anchorRegion.width) &&
		Number.isFinite(anchorRegion.height)
	) {
		return anchorRegion;
	}
	return {
		x: -dimensions.width / 2,
		y: -dimensions.height / 2,
		width: dimensions.width,
		height: dimensions.height,
	};
};

/**
 * Local center of an anchor region, which is the shape center whenever the
 * region fell back to the bounding box.
 *
 * @param region - A region from {@link calcLocalAnchorRegion}
 */
export const calcRegionCenter = (region: Rect): Point => ({
	x: region.x + region.width / 2,
	y: region.y + region.height / 2,
});

/**
 * Local ray origin for an edge anchor: the ratio decides the coordinate along
 * the edge, the anchor region's center the coordinate across it. Keeping the
 * cross coordinate on the region center is what makes `t === 0.5` cast exactly
 * the ray an edge connect point casts for the matching edge midpoint.
 *
 * @param region - A region from {@link calcLocalAnchorRegion}; the ratio is
 *   spread over its side, not the bounding box's
 * @param anchor - The edge and the ratio along it; a ratio outside 0..1 is
 *   clamped and a non-finite one reads as 0.5 (see {@link clampAnchorRatio})
 */
export const calcEdgeAnchorLocalOrigin = (
	region: Rect,
	anchor: Pick<EdgeAnchorSpec, "side" | "t">,
): Point => {
	const ratio = clampAnchorRatio(anchor.t);
	const center = calcRegionCenter(region);
	if (anchor.side === "top" || anchor.side === "bottom") {
		return { x: region.x + region.width * ratio, y: center.y };
	}
	return { x: center.x, y: region.y + region.height * ratio };
};

/**
 * Where a ray cast in local space leaves the outline a geometry's box implies,
 * in the same local space; null where the ray misses it.
 */
type LocalRayOutlineSnapper = (
	dimensions: Dimensions,
	localOrigin: Point,
	localDirection: Point,
) => Point | null;

const snapLocalRayToEllipseOutline: LocalRayOutlineSnapper = (
	{ width, height },
	localOrigin,
	localDirection,
) =>
	// An untransformed ellipse, so the answer stays in local space.
	calcOutlinePointAlongLocalRayForRotatedEllipse(
		{
			cx: 0,
			cy: 0,
			rx: width / 2,
			ry: height / 2,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		},
		localOrigin,
		localDirection,
	);

/**
 * The outline a local ray lands on for each geometry, one entry per
 * GeometryType so that a geometry added to the union has to declare its own.
 * `null` marks a geometry whose box is the outline (`rect`, `point`) or is no
 * outline at all (`none` has no box, `poly` only ever arrives as the real
 * polygon its type supplies): those take the bounding box. The counterpart
 * of the canvas's `adjustToOutline` table for a center-anchored endpoint.
 */
export const localRayOutlineSnapperByGeometry: Readonly<
	Record<GeometryType, LocalRayOutlineSnapper | null>
> = {
	none: null,
	rect: null,
	ellipse: snapLocalRayToEllipseOutline,
	poly: null,
	point: null,
};

/**
 * Where a ray cast in the shape's local space leaves the drawn edge, in the same
 * local space. The outline polygon decides when there is one; otherwise the
 * outline the shape's geometry implies (the ellipse's arc); otherwise the
 * bounding box, which the ray meets on the axis it travels along, keeping the
 * origin's offset on the other axis.
 *
 * @param dimensions - The shape's untransformed box
 * @param geometry - The type's `features.geometry`; undefined reads as a rectangle
 * @param localOrigin - Ray origin, (0, 0) being the shape center
 * @param localDirection - One of {@link EDGE_LOCAL_DIRECTIONS}: the box fallback
 *   reads it as an axis direction of unit length
 * @param outline - The type's outline polygon in the same local space. Fewer
 *   than 2 points, or a ray that misses it, falls back to the geometry's outline
 * @returns The landing, never null: a ray missing every outline lands on the box
 */
export const calcLocalRayLanding = (
	dimensions: Dimensions,
	geometry: GeometryType | undefined,
	localOrigin: Point,
	localDirection: Point,
	outline?: readonly Point[] | null,
): Point => {
	if (outline && outline.length >= 2) {
		const onOutline = castRayOnPolygon(
			outline,
			localOrigin.x,
			localOrigin.y,
			localDirection.x,
			localDirection.y,
		);
		if (onOutline) {
			return onOutline;
		}
	}

	const snapToGeometryOutline = geometry
		? localRayOutlineSnapperByGeometry[geometry]
		: null;
	if (snapToGeometryOutline) {
		const onGeometryOutline = snapToGeometryOutline(
			dimensions,
			localOrigin,
			localDirection,
		);
		if (onGeometryOutline) {
			return onGeometryOutline;
		}
	}

	return {
		x:
			localDirection.x === 0
				? localOrigin.x
				: (localDirection.x * dimensions.width) / 2,
		y:
			localDirection.y === 0
				? localOrigin.y
				: (localDirection.y * dimensions.height) / 2,
	};
};
