import type { Point } from "../types/Point";

/**
 * Applies an affine transformation to a point using pre-computed cos/sin.
 *
 * This is the trig-free core shared by {@link calcAffineTransformedPoint} and by
 * callers that transform multiple points with the same rotation. Computing
 * `Math.cos`/`Math.sin` once and passing them here avoids recomputing the
 * trigonometric values for every point.
 *
 * @param px - X-coordinate of the point to transform
 * @param py - Y-coordinate of the point to transform
 * @param sx - Scale factor in x-direction
 * @param sy - Scale factor in y-direction
 * @param cosTheta - Pre-computed cosine of the rotation angle
 * @param sinTheta - Pre-computed sine of the rotation angle
 * @param tx - Translation distance in x-direction
 * @param ty - Translation distance in y-direction
 * @returns The transformed point
 */
export const applyAffineWithTrig = (
	px: number,
	py: number,
	sx: number,
	sy: number,
	cosTheta: number,
	sinTheta: number,
	tx: number,
	ty: number,
): Point => ({
	x: sx * cosTheta * px - sy * sinTheta * py + tx,
	y: sx * sinTheta * px + sy * cosTheta * py + ty,
});
