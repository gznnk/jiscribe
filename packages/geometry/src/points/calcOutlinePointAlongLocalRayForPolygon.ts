import { castRayOnPolygon } from "./castRayOnPolygon";
import { degreesToRadians } from "../common/degreesToRadians";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
import type { Point } from "../types/Point";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Return the intersection point on a polygon outline along a ray cast in the
 * shape's **local** space, converted to world coordinates. Unlike
 * {@link calcOutlinePointTowardForPolygon} the origin is free rather than the
 * shape center, so an anchor can be centered on a sub-band of the shape (e.g.
 * the rectangular part of a home-plate pentagon) and still land on the outline.
 *
 * Casting locally means the direction is pre-transform: an axis-parallel
 * direction stays axis-parallel relative to the shape and follows its rotation
 * and flip once transformed.
 *
 * Returns null if the ray hits no edge (degenerate polygon or direction, origin
 * outside the shape facing away).
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
