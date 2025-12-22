import type { Point } from "../../../types/core/Point";

/**
 * Applies an inverse affine transformation to a point.
 * Used to convert transformed coordinates back to original coordinates.
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
export const inverseAffineTransformation = (
	px: number,
	py: number,
	sx: number,
	sy: number,
	theta: number,
	tx: number,
	ty: number,
): Point => {
	// Calculate trigonometric values once
	const cosTheta = Math.cos(theta);
	const sinTheta = Math.sin(theta);

	// Apply inverse translation first
	const translatedX = px - tx;
	const translatedY = py - ty;

	// Apply inverse affine transformation
	const originalX = (cosTheta * translatedX + sinTheta * translatedY) / sx;
	const originalY = (-sinTheta * translatedX + cosTheta * translatedY) / sy;

	return { x: originalX, y: originalY };
};
