import { castRayOnPolygon } from "./castRayOnPolygon";
import { degreesToRadians } from "../common/degreesToRadians";
import { applyAffineWithTrig } from "../transform/applyAffineWithTrig";
import { applyInverseAffineWithTrig } from "../transform/applyInverseAffineWithTrig";
import type { Point } from "../types/Point";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Return the intersection point on a polygon outline along the ray from the
 * shape center toward `toward` (world coord). The polygon is given in local,
 * centered coordinates (width/height units, pre-transform); the ray is cast in
 * that local space and only the hit is carried to world space, with the same
 * affine as the renderer / calcFrameKeyPoint, so the result follows the shape's
 * rotation and flip.
 *
 * @param localPolygon - Closed outline in local, centered coordinates; the last
 *   vertex is joined back to the first. Fewer than 2 vertices yields null
 * @param frame - The shape whose center, rotation and flips place the polygon
 * @param toward - World-space point the ray from the center aims at
 * @returns The outline hit, or null if the ray crosses no edge (degenerate
 *   polygon, or `toward` at the center)
 */
export function calcOutlinePointTowardForPolygon(
	localPolygon: readonly Point[],
	frame: TransformedFrame,
	toward: Point,
): Point | null {
	if (localPolygon.length < 2) {
		return null;
	}
	const { cx, cy, rotation, scaleX, scaleY } = frame;
	const angleRad = degreesToRadians(rotation);
	const cosAngle = Math.cos(angleRad);
	const sinAngle = Math.sin(angleRad);

	// Rotation and ±1 flips preserve lengths, so castRayOnPolygon's EPSILON
	// tests mean the same in local space as they would in world space.
	const localDirection = applyInverseAffineWithTrig(
		toward.x,
		toward.y,
		scaleX,
		scaleY,
		cosAngle,
		sinAngle,
		cx,
		cy,
	);
	const localHit = castRayOnPolygon(
		localPolygon,
		0,
		0,
		localDirection.x,
		localDirection.y,
	);
	if (!localHit) {
		return null;
	}

	return applyAffineWithTrig(
		localHit.x,
		localHit.y,
		scaleX,
		scaleY,
		cosAngle,
		sinAngle,
		cx,
		cy,
	);
}
