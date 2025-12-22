import { affineTransformation } from "./affineTransformation";
import type { Point } from "../../../types/core/Point";

/**
 * Applies an efficient affine transformation to a point with optimizations.
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
export const efficientAffineTransformation = (
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

	return affineTransformation(px, py, sx, sy, theta, tx, ty);
};
