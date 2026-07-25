import { applyInverseAffineWithTrig } from "./applyInverseAffineWithTrig";
import type { Point } from "../types/Point";

/**
 * Inverts `calcAffineTransformedPoint`, recovering the original point from
 * a transformed one. `angleRad === 0` takes a trig-free fast path.
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
