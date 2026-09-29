import { degreesToRadians } from "../common/degreesToRadians";
import { EPSILON } from "../constants/EPSILON";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
import type { Point } from "../types/Point";
import type { TransformedEllipse } from "../types/TransformedEllipse";

/**
 * Intersection point on an ellipse outline along a ray cast in the shape's
 * local space, returned in world coordinates. The ellipse counterpart of
 * {@link calcOutlinePointAlongLocalRayForPolygon}: unlike
 * {@link calcOutlinePointTowardForRotatedEllipse}, whose ray always starts at
 * the center, the origin is free — so a connector anchor offset along one side
 * of the ellipse's box still lands on the arc, not on the box.
 *
 * @param ellipse - The shape to hit; a non-positive radius yields null. Its
 *   center, rotation and flips place the local space in the world
 * @param localOrigin - Ray origin in local, centered, unrotated coordinates;
 *   (0, 0) is the ellipse center. An origin on the arc does not hit it — the
 *   ray travels on past it, the way {@link castRayOnPolygon} passes an edge
 * @param localDirection - Ray direction in the same local space, so it is
 *   pre-transform and picks up the rotation and flips on the way out. Not
 *   required to be normalized; a zero vector yields null
 * @returns The arc crossing nearest the origin, only ahead of it along the
 *   direction, in world coordinates. null if the ray never crosses the arc: an
 *   origin outside the ellipse facing away, or one on the arc heading outward
 */
export function calcOutlinePointAlongLocalRayForRotatedEllipse(
	ellipse: TransformedEllipse,
	localOrigin: Point,
	localDirection: Point,
): Point | null {
	const { cx, cy, rx, ry, rotation, scaleX, scaleY } = ellipse;
	if (rx <= 0 || ry <= 0) {
		return null;
	}

	// Ray P = O + t·D against (x/rx)^2 + (y/ry)^2 = 1, a quadratic in t.
	const normalizedDirX = localDirection.x / rx;
	const normalizedDirY = localDirection.y / ry;
	const normalizedOriginX = localOrigin.x / rx;
	const normalizedOriginY = localOrigin.y / ry;
	const a = normalizedDirX * normalizedDirX + normalizedDirY * normalizedDirY;
	if (a === 0) {
		return null;
	}
	const b =
		2 *
		(normalizedOriginX * normalizedDirX + normalizedOriginY * normalizedDirY);
	const c =
		normalizedOriginX * normalizedOriginX +
		normalizedOriginY * normalizedOriginY -
		1;
	const discriminant = b * b - 4 * a * c;
	if (discriminant < 0) {
		return null;
	}

	// The nearer root first; it is the one ahead of an origin outside the
	// ellipse, while an origin inside always has it behind.
	const sqrtDiscriminant = Math.sqrt(discriminant);
	const nearT = (-b - sqrtDiscriminant) / (2 * a);
	const farT = (-b + sqrtDiscriminant) / (2 * a);
	let t: number;
	if (nearT > EPSILON) {
		t = nearT;
	} else if (farT > EPSILON) {
		t = farT;
	} else {
		return null;
	}

	return calcAffineTransformedPoint(
		localOrigin.x + t * localDirection.x,
		localOrigin.y + t * localDirection.y,
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		cx,
		cy,
	);
}
