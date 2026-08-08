import type { Point } from "../types/Point";

/**
 * Rotates point `(px, py)` around center `(cx, cy)` using pre-computed cos/sin.
 * Trig-free core of {@link calcRotatedPoint}: pass one cos/sin pair when
 * rotating many points by the same angle. For the inverse rotation pass
 * `(cosAngle, -sinAngle)`.
 *
 * @param px - X of the point to rotate
 * @param py - Y of the point to rotate
 * @param cx - X of the center to rotate around
 * @param cy - Y of the center to rotate around
 * @param cosAngle - `Math.cos` of the rotation angle in radians
 * @param sinAngle - `Math.sin` of the same angle
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
