import {
	calcAffineTransformedPoint,
	calcEuclideanDistance,
	calcInverseAffineTransformedPoint,
	calcNonZeroSign,
	calcOutlinePointAlongLocalRayForPolygon,
	calcRotatedPointWithTrig,
	degreesToRadians,
	roundToDecimal,
	snapToDirection,
	type OrthogonalDirection,
	type Point,
	type Rect,
	type TransformedFrame,
} from "@jiscribe/geometry";

import { PRECISION } from "../../../../constants/precision";
import type {
	ConnectPointId,
	EdgeAnchorSide,
	EdgeAnchorSpec,
} from "../../../../schemas/objects/types/EndpointRef";
import type { ExtraConnectPoint } from "../../registry/ObjectExtraConnectPointsRegistry";

/** Outward direction of each local bounding-box edge in the shape's local space. */
const EDGE_LOCAL_DIRECTIONS: Record<EdgeAnchorSide, Point> = {
	top: { x: 0, y: -1 },
	right: { x: 1, y: 0 },
	bottom: { x: 0, y: 1 },
	left: { x: -1, y: 0 },
};

/** Outward direction of each edge connect point in the shape's local space. */
const CONNECT_POINT_LOCAL_DIRECTIONS: Record<ConnectPointId, Point> = {
	topCenter: EDGE_LOCAL_DIRECTIONS.top,
	rightCenter: EDGE_LOCAL_DIRECTIONS.right,
	bottomCenter: EDGE_LOCAL_DIRECTIONS.bottom,
	leftCenter: EDGE_LOCAL_DIRECTIONS.left,
};

/** The ratio held to 0..1; a non-finite one reads as the edge midpoint. */
const clampAnchorRatio = (t: number): number => {
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
 */
const calcLocalAnchorRegion = (
	frame: TransformedFrame,
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
		x: -frame.width / 2,
		y: -frame.height / 2,
		width: frame.width,
		height: frame.height,
	};
};

/**
 * Local center of the anchor region, which is the shape center whenever the
 * region falls back to the bounding box.
 */
const calcRegionCenter = (region: Rect): Point => ({
	x: region.x + region.width / 2,
	y: region.y + region.height / 2,
});

/**
 * A local outward direction carried into world space by the shape's flips and
 * rotation, unsnapped. Kept separate from the endpoint resolution so the anchor
 * dots can push themselves off the shape along the same vector the router later
 * snaps to an axis.
 *
 * @param frame - The shape the direction belongs to; only its rotation and the
 *   signs of its scales are read
 * @param localDirection - Outward direction in the shape's local space; its
 *   length is preserved (the flip is applied as a sign, not a scale)
 * @returns The same direction in world space
 */
export const calcOutwardVector = (
	frame: TransformedFrame,
	localDirection: Point,
): Point => {
	const radians = degreesToRadians(frame.rotation);
	return calcRotatedPointWithTrig(
		localDirection.x * calcNonZeroSign(frame.scaleX),
		localDirection.y * calcNonZeroSign(frame.scaleY),
		0,
		0,
		Math.cos(radians),
		Math.sin(radians),
	);
};

/**
 * World position of one edge connect point.
 *
 * The anchor region (local rect from ObjectAnchorRegionRegistry, default = the
 * full bounding box) fixes only the ray origin; the outline decides where the
 * ray lands, so the anchor always sits on the drawn edge. Shapes with no
 * registered outline resolve analytically against the bounding box, which for a
 * centered origin reproduces `calcFrameKeyPoint`.
 *
 * @param frame - The shape the anchor belongs to; its rotation and flips carry
 *   into the result
 * @param connectPointId - Which of the four edge anchors to resolve
 * @param outline - The shape's outline polygon in local, centered coordinates
 *   (from ObjectOutlineRegistry). Omitted, or a ray that misses it, falls back
 *   to the bounding box
 * @param anchorRegion - The band to center the anchors on, in the same local
 *   space (from ObjectAnchorRegionRegistry). Omitted = the full bounding box,
 *   i.e. the edge midpoints
 * @returns The anchor in world coordinates
 */
export const calcConnectPoint = (
	frame: TransformedFrame,
	connectPointId: ConnectPointId,
	outline?: readonly Point[] | null,
	anchorRegion?: Rect | null,
): Point => {
	const origin = calcRegionCenter(calcLocalAnchorRegion(frame, anchorRegion));
	const direction = CONNECT_POINT_LOCAL_DIRECTIONS[connectPointId];

	if (outline && outline.length >= 2) {
		const onOutline = calcOutlinePointAlongLocalRayForPolygon(
			outline,
			frame,
			origin,
			direction,
		);
		if (onOutline) {
			return onOutline;
		}
	}

	// The ray meets the bounding box on the axis it travels along and keeps the
	// origin's offset on the other axis.
	const localX = direction.x === 0 ? origin.x : (direction.x * frame.width) / 2;
	const localY =
		direction.y === 0 ? origin.y : (direction.y * frame.height) / 2;
	return calcAffineTransformedPoint(
		localX,
		localY,
		frame.scaleX,
		frame.scaleY,
		degreesToRadians(frame.rotation),
		frame.cx,
		frame.cy,
	);
};

/**
 * Orthogonal direction in which a connector exits the shape at an edge connect
 * point. Derived from the local outward direction transformed by the shape's
 * rotation and flip, so it stays exact even when the anchor region moves the
 * anchor off the bounding-box edge midpoint (a "center → anchor" vector would
 * pick the wrong axis on a tall, narrow shape).
 *
 * @param frame - The shape the anchor belongs to; only its rotation and the
 *   signs of its scales matter
 * @param connectPointId - Which of the four edge anchors to take the normal of
 * @returns The world-space axis direction, snapped to the nearest of the four
 *   even when the shape sits at an odd rotation
 */
export const calcConnectPointDirection = (
	frame: TransformedFrame,
	connectPointId: ConnectPointId,
): OrthogonalDirection => {
	const vector = calcOutwardVector(
		frame,
		CONNECT_POINT_LOCAL_DIRECTIONS[connectPointId],
	);
	return snapToDirection(vector.x, vector.y);
};

/**
 * Local ray origin for an edge anchor: the ratio decides the coordinate along
 * the edge, the anchor region's center the coordinate across it. Keeping the
 * cross coordinate on the region center is what makes `t === 0.5` cast exactly
 * the ray {@link calcConnectPoint} casts for the matching edge midpoint.
 */
const calcEdgeAnchorLocalOrigin = (
	region: Rect,
	anchor: EdgeAnchorSpec,
): Point => {
	const ratio = clampAnchorRatio(anchor.t);
	const center = calcRegionCenter(region);
	if (anchor.side === "top" || anchor.side === "bottom") {
		return { x: region.x + region.width * ratio, y: center.y };
	}
	return { x: center.x, y: region.y + region.height * ratio };
};

/**
 * World position of an edge anchor — a point free to sit anywhere along one of
 * the shape's local edges (see {@link EdgeAnchorSpec}).
 *
 * Resolved exactly like an edge connect point, only with the ray offset along
 * the edge by the ratio instead of pinned to the middle: the anchor region fixes
 * where the ray starts and the outline decides where it lands, so the anchor
 * always sits on the drawn edge. A `t` of 0.5 therefore reproduces
 * {@link calcConnectPoint} for the matching {@link ConnectPointId}.
 *
 * @param frame - The shape the anchor belongs to; its rotation and flips carry
 *   into the result, so `side` names the edge before they are applied
 * @param anchor - The edge anchor to resolve; a `t` outside 0..1 is clamped and
 *   a non-finite one reads as 0.5 (docs are validated, this only keeps a bad
 *   value from producing NaN coordinates)
 * @param outline - The shape's outline polygon in local, centered coordinates
 *   (from ObjectOutlineRegistry). Omitted, or a ray that misses it, falls back
 *   to the bounding box
 * @param anchorRegion - The band to spread the ratio over, in the same local
 *   space (from ObjectAnchorRegionRegistry). Omitted = the full bounding box
 * @returns The anchor in world coordinates
 */
export const calcEdgeAnchorPoint = (
	frame: TransformedFrame,
	anchor: EdgeAnchorSpec,
	outline?: readonly Point[] | null,
	anchorRegion?: Rect | null,
): Point => {
	const region = calcLocalAnchorRegion(frame, anchorRegion);
	const origin = calcEdgeAnchorLocalOrigin(region, anchor);
	const direction = EDGE_LOCAL_DIRECTIONS[anchor.side];

	if (outline && outline.length >= 2) {
		const onOutline = calcOutlinePointAlongLocalRayForPolygon(
			outline,
			frame,
			origin,
			direction,
		);
		if (onOutline) {
			return onOutline;
		}
	}

	// The ray meets the bounding box on the axis it travels along and keeps the
	// origin's offset — the ratio — on the other axis.
	const localX = direction.x === 0 ? origin.x : (direction.x * frame.width) / 2;
	const localY =
		direction.y === 0 ? origin.y : (direction.y * frame.height) / 2;
	return calcAffineTransformedPoint(
		localX,
		localY,
		frame.scaleX,
		frame.scaleY,
		degreesToRadians(frame.rotation),
		frame.cx,
		frame.cy,
	);
};

/**
 * Orthogonal direction in which a connector exits an edge anchor, i.e. that
 * edge's outward normal under the shape's flips and rotation. It does not depend
 * on the ratio: every point along one edge leaves the shape the same way.
 *
 * @param frame - The shape the anchor belongs to; only its rotation and the
 *   signs of its scales matter
 * @param side - Which local edge to take the normal of
 * @returns The world-space axis direction, snapped to the nearest of the four
 *   even when the shape sits at an odd rotation
 */
export const calcEdgeAnchorDirection = (
	frame: TransformedFrame,
	side: EdgeAnchorSide,
): OrthogonalDirection => {
	const vector = calcOutwardVector(frame, EDGE_LOCAL_DIRECTIONS[side]);
	return snapToDirection(vector.x, vector.y);
};

/**
 * The edge anchor a world position rounds to — the inverse of
 * {@link calcEdgeAnchorPoint}, used when a connection is dropped somewhere the
 * named anchors do not cover.
 *
 * The position is taken back into the shape's local space and matched against
 * the anchor region's four sides, each treated as a segment so a position past a
 * corner still picks the side it is nearest to. The outline is deliberately not
 * consulted: it decides how far out an anchor lands, not which edge it belongs
 * to, and rounding against the same rect the forward rays start from is what
 * makes the round trip stable.
 *
 * @param frame - The shape being dropped onto; its rotation and flips are undone
 *   first, so the returned `side` names the edge in local space
 * @param worldPoint - The dropped position in world coordinates; one inside the
 *   shape projects outward to the nearest side, one outside inward to it
 * @param anchorRegion - The band to measure the ratio over, in local coordinates
 *   (from ObjectAnchorRegionRegistry). Omitted = the full bounding box
 * @returns The anchor, its ratio clamped to 0..1 and rounded for storage. Sides
 *   equally near are broken in top → right → bottom → left order, and a
 *   zero-width or zero-height region yields 0.5 on the collapsed axis
 */
export const calcEdgeAnchorFromPoint = (
	frame: TransformedFrame,
	worldPoint: Point,
	anchorRegion?: Rect | null,
): EdgeAnchorSpec => {
	const local = calcInverseAffineTransformedPoint(
		worldPoint.x,
		worldPoint.y,
		frame.scaleX,
		frame.scaleY,
		degreesToRadians(frame.rotation),
		frame.cx,
		frame.cy,
	);
	const region = calcLocalAnchorRegion(frame, anchorRegion);
	const right = region.x + region.width;
	const bottom = region.y + region.height;

	const ratioX =
		region.width > 0
			? clampAnchorRatio((local.x - region.x) / region.width)
			: 0.5;
	const ratioY =
		region.height > 0
			? clampAnchorRatio((local.y - region.y) / region.height)
			: 0.5;
	// The projection onto each side, clamped to the side's own extent.
	const alongX = region.x + region.width * ratioX;
	const alongY = region.y + region.height * ratioY;

	const candidates: Array<{ side: EdgeAnchorSide; t: number; gap: number }> = [
		{
			side: "top",
			t: ratioX,
			gap: calcEuclideanDistance(local.x, local.y, alongX, region.y),
		},
		{
			side: "right",
			t: ratioY,
			gap: calcEuclideanDistance(local.x, local.y, right, alongY),
		},
		{
			side: "bottom",
			t: ratioX,
			gap: calcEuclideanDistance(local.x, local.y, alongX, bottom),
		},
		{
			side: "left",
			t: ratioY,
			gap: calcEuclideanDistance(local.x, local.y, region.x, alongY),
		},
	];

	let nearest = candidates[0];
	for (const candidate of candidates) {
		if (candidate.gap < nearest.gap) {
			nearest = candidate;
		}
	}

	return {
		kind: "edge",
		side: nearest.side,
		t: roundToDecimal(nearest.t, PRECISION.COORDINATE),
	};
};

/**
 * World position of one extra connect point — a named anchor the shape's type
 * declares itself (ObjectExtraConnectPointsRegistry). The declared local point is
 * carried straight through the frame transform: unlike an edge anchor it is not
 * cast against the outline, because the type already said where its own point is.
 *
 * @param frame - The shape the anchor belongs to; its position, rotation, scale
 *   and flips all carry into the result
 * @param extraConnectPoint - The declared anchor; only its `point` is read here
 * @returns The anchor in world coordinates
 */
export const calcExtraConnectPoint = (
	frame: TransformedFrame,
	extraConnectPoint: ExtraConnectPoint,
): Point =>
	calcAffineTransformedPoint(
		extraConnectPoint.point.x,
		extraConnectPoint.point.y,
		frame.scaleX,
		frame.scaleY,
		degreesToRadians(frame.rotation),
		frame.cx,
		frame.cy,
	);

/**
 * Orthogonal direction in which a connector exits an extra connect point,
 * i.e. the declared local outward vector under the shape's flips and rotation.
 *
 * @param frame - The shape the anchor belongs to; only its rotation and the
 *   signs of its scales matter
 * @param extraConnectPoint - The declared anchor; only its `direction` is read here
 * @returns The world-space axis direction, snapped to the nearest of the four
 *   even when the declared vector is diagonal or the shape sits at an odd rotation
 */
export const calcExtraConnectPointDirection = (
	frame: TransformedFrame,
	extraConnectPoint: ExtraConnectPoint,
): OrthogonalDirection => {
	const vector = calcOutwardVector(frame, extraConnectPoint.direction);
	return snapToDirection(vector.x, vector.y);
};
