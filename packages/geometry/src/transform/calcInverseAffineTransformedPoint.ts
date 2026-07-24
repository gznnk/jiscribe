import { applyInverseAffineWithTrig } from "./applyInverseAffineWithTrig";
import type { Point } from "../types/Point";

/**
 * Applies an inverse affine transformation to a point.
 * Used to convert transformed coordinates back to original coordinates.
 * Includes optimization for zero rotation.
 *
 * @param px - X-coordinate of the transformed point
 * @param py - Y-coordinate of the transformed point
 * @param sx - Scale factor in x-direction from the original transformation
 * @param sy - Scale factor in y-direction from the original transformation
 * @param angleRad - Rotation angle in radians from the original transformation
 * @param tx - Translation distance in x-direction from the original transformation
 * @param ty - Translation distance in y-direction from the original transformation
 * @returns The original point before transformation
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
	// Special case optimization: no rotation
	if (angleRad === 0) {
		return {
			x: (px - tx) / sx,
			y: (py - ty) / sy,
		};
	}

	// Calculate trigonometric values once, then delegate to the shared core
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
