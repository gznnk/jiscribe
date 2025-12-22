import { inverseAffineTransformation } from "./inverseAffineTransformation";
import type { Point } from "../../../types/core/Point";

/**
 * Applies an efficient inverse affine transformation to a point with optimizations.
 *
 * @param px - X-coordinate of the transformed point
 * @param py - Y-coordinate of the transformed point
 * @param sx - Scale factor in x-direction from the original transformation
 * @param sy - Scale factor in y-direction from the original transformation
 * @param theta - Rotation angle in radians from the original transformation
 * @param tx - Translation distance in x-direction from the original transformation
 * @param ty - Translation distance in y-direction from the original transformation
 * @returns The original point before transformation
 */
export const efficientInverseAffineTransformation = (
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
			x: (px - tx) / sx,
			y: (py - ty) / sy,
		};
	}

	return inverseAffineTransformation(px, py, sx, sy, theta, tx, ty);
};
