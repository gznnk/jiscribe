import type { Point } from "../types/Point";

/**
 * Rotates point `(px, py)` around center `(cx, cy)` using pre-computed cos/sin.
 * Trig-free core of {@link calcRotatedPoint}: pass one cos/sin pair when
 * rotating many points by the same angle. For the inverse rotation pass
 * `(cosAngle, -sinAngle)`.
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
