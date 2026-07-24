import type { Point } from "../types/Point";

/**
 * Applies an inverse affine transformation to a point using pre-computed cos/sin.
 *
 * This is the trig-free core shared by {@link calcInverseAffineTransformedPoint}
 * and by callers that inverse-transform multiple points with the same rotation
 * (e.g. {@link calcOrientedFrameFromPoints}). Computing `Math.cos`/`Math.sin`
 * once and passing them here avoids recomputing the trigonometric values for
 * every point.
 *
 * @param px - X-coordinate of the transformed point
 * @param py - Y-coordinate of the transformed point
 * @param sx - Scale factor in x-direction from the original transformation
 * @param sy - Scale factor in y-direction from the original transformation
 * @param cosAngle - Pre-computed cosine of the rotation angle
 * @param sinAngle - Pre-computed sine of the rotation angle
 * @param tx - Translation distance in x-direction from the original transformation
 * @param ty - Translation distance in y-direction from the original transformation
 * @returns The original point before transformation
 */
export const applyInverseAffineWithTrig = (
	px: number,
	py: number,
	sx: number,
	sy: number,
	cosAngle: number,
	sinAngle: number,
	tx: number,
	ty: number,
): Point => {
	// Apply inverse translation first
	const translatedX = px - tx;
	const translatedY = py - ty;

	// Apply inverse affine transformation
	return {
		x: (cosAngle * translatedX + sinAngle * translatedY) / sx,
		y: (-sinAngle * translatedX + cosAngle * translatedY) / sy,
	};
};
