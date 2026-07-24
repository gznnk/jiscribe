import type { Point } from "../types/Point";

/**
 * Rotates a point around a center using pre-computed cos/sin.
 *
 * This is the trig-free core shared by {@link calcRotatedPoint} and by callers
 * that rotate multiple points — or the same angle in both directions — with one
 * cos/sin pair. Computing `Math.cos`/`Math.sin` once and passing them here avoids
 * recomputing the trigonometric values per call. For the inverse rotation,
 * pass `(cosAngle, -sinAngle)` since `cos(-θ) = cos(θ)` and `sin(-θ) = -sin(θ)`.
 *
 * @param px - X-coordinate of the point to rotate
 * @param py - Y-coordinate of the point to rotate
 * @param cx - X-coordinate of the rotation center
 * @param cy - Y-coordinate of the rotation center
 * @param cosAngle - Pre-computed cosine of the rotation angle
 * @param sinAngle - Pre-computed sine of the rotation angle
 * @returns The rotated point
 */
export const calcRotatedPointWithTrig = (
	px: number,
	py: number,
	cx: number,
	cy: number,
	cosAngle: number,
	sinAngle: number,
): Point => {
	const dx = px - cx;
	const dy = py - cy;

	return {
		x: cx + (dx * cosAngle - dy * sinAngle),
		y: cy + (dx * sinAngle + dy * cosAngle),
	};
};
