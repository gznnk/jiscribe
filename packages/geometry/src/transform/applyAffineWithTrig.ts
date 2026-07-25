import type { Point } from "../types/Point";

/**
 * Applies an affine transform (scale, then rotate, then translate) to a point
 * using pre-computed cos/sin. Trig-free core of
 * {@link calcAffineTransformedPoint}: pass one cos/sin pair when transforming
 * many points with the same rotation.
 */
export const applyAffineWithTrig = (
	px: number,
	py: number,
	sx: number,
	sy: number,
	cosAngle: number,
	sinAngle: number,
	tx: number,
	ty: number,
): Point => ({
	x: sx * cosAngle * px - sy * sinAngle * py + tx,
	y: sx * sinAngle * px + sy * cosAngle * py + ty,
});
