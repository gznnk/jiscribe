import {
	calcAffineTransformedPoint,
	calcNonZeroSign,
	calcOutlinePointAlongLocalRayForPolygon,
	calcRotatedPointWithTrig,
	degreesToRadians,
	snapToDirection,
	type OrthogonalDirection,
	type Point,
	type Rect,
	type TransformedFrame,
} from "@workspace/geometry";

import type { ConnectPointId } from "../../../schemas/objects/types/EndpointRef";

/** Outward direction of each edge connect point in the shape's local space. */
const CONNECT_POINT_LOCAL_DIRECTIONS: Record<ConnectPointId, Point> = {
	topCenter: { x: 0, y: -1 },
	rightCenter: { x: 1, y: 0 },
	bottomCenter: { x: 0, y: 1 },
	leftCenter: { x: -1, y: 0 },
};

/** Local center of the anchor region; the shape center when none is registered. */
const calcRayOrigin = (anchorRegion?: Rect | null): Point =>
	anchorRegion
		? {
				x: anchorRegion.x + anchorRegion.width / 2,
				y: anchorRegion.y + anchorRegion.height / 2,
			}
		: { x: 0, y: 0 };

/**
 * World position of one edge connect point.
 *
 * The anchor region (local rect from ObjectAnchorRegionRegistry, default = the
 * full bounding box) fixes only the ray origin; the outline decides where the
 * ray lands, so the anchor always sits on the drawn edge. Shapes with no
 * registered outline resolve analytically against the bounding box, which for a
 * centered origin reproduces `calcFrameKeyPoint`.
 *
 * @param frame - The shape's transformed frame
 * @param connectPointId - Which edge connect point to resolve
 * @param outline - The shape's local outline polygon (from ObjectOutlineRegistry). Omitted = bounding box
 * @param anchorRegion - The shape's local anchor region. Omitted = full bounding box
 */
export const calcConnectPoint = (
	frame: TransformedFrame,
	connectPointId: ConnectPointId,
	outline?: readonly Point[] | null,
	anchorRegion?: Rect | null,
): Point => {
	const origin = calcRayOrigin(anchorRegion);
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
 */
export const calcConnectPointDirection = (
	frame: TransformedFrame,
	connectPointId: ConnectPointId,
): OrthogonalDirection => {
	const direction = CONNECT_POINT_LOCAL_DIRECTIONS[connectPointId];
	const flippedX = direction.x * calcNonZeroSign(frame.scaleX);
	const flippedY = direction.y * calcNonZeroSign(frame.scaleY);

	const radians = degreesToRadians(frame.rotation);
	const rotated = calcRotatedPointWithTrig(
		flippedX,
		flippedY,
		0,
		0,
		Math.cos(radians),
		Math.sin(radians),
	);
	return snapToDirection(rotated.x, rotated.y);
};
