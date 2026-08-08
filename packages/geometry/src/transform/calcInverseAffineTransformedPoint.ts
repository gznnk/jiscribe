import { applyInverseAffineWithTrig } from "./applyInverseAffineWithTrig";
import type { Point } from "../types/Point";

/**
 * Inverts `calcAffineTransformedPoint`, recovering the original point from
 * a transformed one. `angleRad === 0` takes a trig-free fast path.
 *
 * Every argument is the one that was passed to the forward transform.
 *
 * @param px - Point x in world space
 * @param py - Point y in world space
 * @param sx - Horizontal scale that was applied; must not be 0
 * @param sy - Vertical scale that was applied; must not be 0
 * @param angleRad - Rotation in radians that was applied, unnegated
 * @param tx - Translation x that was applied
 * @param ty - Translation y that was applied
 * @returns The point in local space (origin at the shape center)
 */
export const calcInverseAffineTransformedPoint = (
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
			x: (px - tx) / sx,
			y: (py - ty) / sy,
		};
	}

	return applyInverseAffineWithTrig(
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
