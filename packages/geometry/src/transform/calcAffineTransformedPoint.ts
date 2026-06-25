import { applyAffineWithTrig } from "./applyAffineWithTrig";
import type { Point } from "../types/Point";

/**
 * Applies an affine transformation to a point.
 * Includes optimization for zero rotation.
 *
 * @param px - X-coordinate of the point to transform
 * @param py - Y-coordinate of the point to transform
 * @param sx - Scale factor in x-direction
 * @param sy - Scale factor in y-direction
 * @param theta - Rotation angle in radians
 * @param tx - Translation distance in x-direction
 * @param ty - Translation distance in y-direction
 * @returns The transformed point
 */
export const calcAffineTransformedPoint = (
	px: number,
	py: number,
	sx: number,
	sy: number,
	theta: number,
	tx: number,
	ty: number,
): Point => {
	// Special case optimization: no rotation
	if (theta === 0) {
		return {
			x: sx * px + tx,
			y: sy * py + ty,
		};
	}

	// Calculate trigonometric values once, then delegate to the shared core
	return applyAffineWithTrig(
		px,
		py,
		sx,
		sy,
		Math.cos(theta),
		Math.sin(theta),
		tx,
		ty,
	);
};
