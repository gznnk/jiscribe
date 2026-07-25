import type { Point } from "../types/Point";

/**
 * Inverts `applyAffineWithTrig` using pre-computed cos/sin: undoes the
 * translation, then the rotation, then the scale. Pass one cos/sin pair when
 * inverse-transforming many points with the same rotation.
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
	const translatedX = px - tx;
	const translatedY = py - ty;

	return {
		x: (cosAngle * translatedX + sinAngle * translatedY) / sx,
		y: (-sinAngle * translatedX + cosAngle * translatedY) / sy,
	};
};
