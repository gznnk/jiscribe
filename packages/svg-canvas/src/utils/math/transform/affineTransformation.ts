import type { Point } from "../../../types/core/Point";

/**
 * Applies an affine transformation to a point.
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
export const affineTransformation = (
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

	// Apply affine transformation with pre-computed values
	const transformedX = sx * cosTheta * px - sy * sinTheta * py + tx;
	const transformedY = sx * sinTheta * px + sy * cosTheta * py + ty;

	return { x: transformedX, y: transformedY };
};
