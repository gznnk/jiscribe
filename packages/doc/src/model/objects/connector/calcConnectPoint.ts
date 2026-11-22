import {
	calcAffineTransformedPoint,
	calcNonZeroSign,
	calcRotatedPointWithTrig,
	degreesToRadians,
	snapToDirection,
	type OrthogonalDirection,
	type Point,
	type Rect,
	type TransformedFrame,
} from "@jiscribe/geometry";

import type { EndpointOwner } from "./EndpointOwner";
import type { ExtraConnectPoint } from "./ExtraConnectPoint";
import {
	EDGE_LOCAL_DIRECTIONS,
	calcEdgeAnchorLocalOrigin,
	calcLocalAnchorRegion,
	calcLocalRayLanding,
	calcRegionCenter,
} from "./localAnchorRay";
import type {
	ConnectPointId,
	EdgeAnchorSide,
	EdgeAnchorSpec,
} from "../types/EndpointRef";

/**
 * The shape an anchor is resolved on: its frame, plus its features descriptor
 * when the caller holds one. Only `geometry` is read, and only for a shape with
 * no outline polygon, to pick the outline its box implies over the box itself.
 * A bare frame reads as a rectangle.
 */
export type AnchorFrame = TransformedFrame & Pick<EndpointOwner, "features">;

/** Outward direction of each edge connect point in the shape's local space. */
const CONNECT_POINT_LOCAL_DIRECTIONS: Record<ConnectPointId, Point> = {
	topCenter: EDGE_LOCAL_DIRECTIONS.top,
	rightCenter: EDGE_LOCAL_DIRECTIONS.right,
	bottomCenter: EDGE_LOCAL_DIRECTIONS.bottom,
	leftCenter: EDGE_LOCAL_DIRECTIONS.left,
};

/**
 * Where a ray cast in the shape's local space leaves the drawn edge (see
 * calcLocalRayLanding), carried into world space by the shape's transform.
 */
const calcWorldRayLanding = (
	frame: AnchorFrame,
	localOrigin: Point,
	localDirection: Point,
	outline?: readonly Point[] | null,
): Point => {
	const landing = calcLocalRayLanding(
		frame,
		frame.features?.geometry,
		localOrigin,
		localDirection,
		outline,
	);
	return calcAffineTransformedPoint(
		landing.x,
		landing.y,
		frame.scaleX,
		frame.scaleY,
		degreesToRadians(frame.rotation),
		frame.cx,
		frame.cy,
	);
};

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
 * The anchor region (local rect the type's `anchorRegion` declares, default = the
 * full bounding box) fixes only the ray origin; the outline decides where the
 * ray lands, so the anchor always sits on the drawn edge. Shapes with no
 * declared outline resolve analytically against what their geometry draws:
 * the arc for an ellipse, otherwise the bounding box, which for a centered
 * origin reproduces `calcFrameKeyPoint`.
 *
 * @param frame - The shape the anchor belongs to; its rotation and flips carry
 *   into the result, and its `features.geometry` picks the analytic outline
 *   when no polygon is given (a bare frame reads as a rectangle)
 * @param connectPointId - Which of the four edge anchors to resolve
 * @param outline - The shape's outline polygon in local, centered coordinates
 *   (the type's `outline`). Omitted, or a ray that misses it, falls back
 *   to the geometry's own outline
 * @param anchorRegion - The band to center the anchors on, in the same local
 *   space (the type's `anchorRegion`). Omitted = the full bounding box,
 *   i.e. the edge midpoints
 * @returns The anchor in world coordinates
 */
export const calcConnectPoint = (
	frame: AnchorFrame,
	connectPointId: ConnectPointId,
	outline?: readonly Point[] | null,
	anchorRegion?: Rect | null,
): Point => {
	const origin = calcRegionCenter(calcLocalAnchorRegion(frame, anchorRegion));
	const direction = CONNECT_POINT_LOCAL_DIRECTIONS[connectPointId];
	return calcWorldRayLanding(frame, origin, direction, outline);
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
 *   into the result, so `side` names the edge before they are applied, and its
 *   `features.geometry` picks the analytic outline when no polygon is given (a
 *   bare frame reads as a rectangle)
 * @param anchor - The edge anchor to resolve; a `t` outside 0..1 is clamped and
 *   a non-finite one reads as 0.5 (docs are validated, this only keeps a bad
 *   value from producing NaN coordinates)
 * @param outline - The shape's outline polygon in local, centered coordinates
 *   (the type's `outline`). Omitted, or a ray that misses it, falls back
 *   to the geometry's own outline
 * @param anchorRegion - The band to spread the ratio over, in the same local
 *   space (the type's `anchorRegion`). Omitted = the full bounding box
 * @returns The anchor in world coordinates
 */
export const calcEdgeAnchorPoint = (
	frame: AnchorFrame,
	anchor: EdgeAnchorSpec,
	outline?: readonly Point[] | null,
	anchorRegion?: Rect | null,
): Point => {
	const region = calcLocalAnchorRegion(frame, anchorRegion);
	const origin = calcEdgeAnchorLocalOrigin(region, anchor);
	const direction = EDGE_LOCAL_DIRECTIONS[anchor.side];
	return calcWorldRayLanding(frame, origin, direction, outline);
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
 * World position of one extra connect point — a named anchor the shape's type
 * declares itself ({@link ExtraConnectPoint}). The declared local point is
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
