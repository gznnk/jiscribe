import { applyAffineWithTrig } from "./applyAffineWithTrig";
import type { Point } from "../types/Point";

/**
 * Applies an affine transform (scale, then rotate by `angleRad`, then translate)
 * to a point. `angleRad === 0` takes a trig-free fast path.
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
