import type { Point } from "../types/Point";

/**
 * Applies an affine transform (scale, then rotate, then translate) to a point
 * using pre-computed cos/sin. Trig-free core of
 * {@link calcAffineTransformedPoint}: pass one cos/sin pair when transforming
 * many points with the same rotation.
 *
 * @param px - Point x in local space (origin at the shape center)
 * @param py - Point y in local space
 * @param sx - Horizontal scale; callers pass a `FlipScale` (1 or -1)
 * @param sy - Vertical scale; callers pass a `FlipScale` (1 or -1)
 * @param cosAngle - `Math.cos` of the rotation angle in radians
 * @param sinAngle - `Math.sin` of the same angle
 * @param tx - Translation x, usually the shape center in world space
 * @param ty - Translation y, usually the shape center in world space
 */
export const applyAffineWithTrig = (
	px: number,
	py: number,
	sx: number,
	sy: number,
	cosAngle: number,
	sinAngle: number,
	tx: number,
	ty: number,
): Point => ({
	x: sx * cosAngle * px - sy * sinAngle * py + tx,
	y: sx * sinAngle * px + sy * cosAngle * py + ty,
});
