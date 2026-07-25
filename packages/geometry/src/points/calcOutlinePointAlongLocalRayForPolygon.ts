import { castRayOnPolygon } from "./castRayOnPolygon";
import { degreesToRadians } from "../common/degreesToRadians";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
import type { Point } from "../types/Point";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Intersection point on a polygon outline along a ray cast in the shape's local
 * space, returned in world coordinates. Unlike
 * {@link calcOutlinePointTowardForPolygon}, whose ray always starts at the
 * center, the origin is free — so a connector anchor can be centered on a
 * sub-band of the shape (the rectangular part of a home-plate pentagon, say)
 * and still land on the drawn edge.
 *
 * @param localPolygon - Closed outline in local, centered coordinates; the last
 *   vertex is joined back to the first. Fewer than 2 vertices yields null
 * @param frame - The shape whose center, rotation and flips place the polygon
 * @param localOrigin - Ray origin in the same local space as `localPolygon`;
 *   the origin (0, 0) is the shape center
 * @param localDirection - Ray direction in local space, so it is pre-transform:
 *   an axis-parallel direction stays axis-parallel relative to the shape and
 *   picks up its rotation and flips on the way out. Not required to be normalized
 * @returns The outline hit in world coordinates, or null if the ray crosses no
 *   edge (degenerate polygon or direction, or an origin outside the shape
 *   facing away)
 */
export function calcOutlinePointAlongLocalRayForPolygon(
	localPolygon: readonly Point[],
	frame: TransformedFrame,
	localOrigin: Point,
	localDirection: Point,
): Point | null {
	if (localPolygon.length < 2) {
		return null;
	}

	const localHit = castRayOnPolygon(
		localPolygon,
		localOrigin.x,
		localOrigin.y,
		localDirection.x,
		localDirection.y,
	);
	if (!localHit) {
		return null;
	}

	const { cx, cy, rotation, scaleX, scaleY } = frame;
	return calcAffineTransformedPoint(
		localHit.x,
		localHit.y,
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		cx,
		cy,
	);
}
