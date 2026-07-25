import { applyAffineWithTrig } from "./applyAffineWithTrig";
import type { Point } from "../types/Point";

/**
 * Applies an affine transform (scale, then rotate by `angleRad`, then translate)
 * to a point. `angleRad === 0` takes a trig-free fast path.
 *
 * @param px - Point x in local space (origin at the shape center)
 * @param py - Point y in local space
 * @param sx - Horizontal scale; callers pass a `FlipScale` (1 or -1)
 * @param sy - Vertical scale; callers pass a `FlipScale` (1 or -1)
 * @param angleRad - Rotation in radians; convert `Transform.rotation` with
 *   `degreesToRadians`
 * @param tx - Translation x, usually the shape center in world space
 * @param ty - Translation y, usually the shape center in world space
 */
export const calcAffineTransformedPoint = (
	px: number,
	py: number,
	sx: number,
	sy: number,
	angleRad: number,
	tx: number,
	ty: number,
): Point => {
	if (angleRad === 0) {
		return {
			x: sx * px + tx,
			y: sy * py + ty,
		};
	}

	return applyAffineWithTrig(
		px,
		py,
		sx,
		sy,
		Math.cos(angleRad),
		Math.sin(angleRad),
		tx,
		ty,
	);
};
