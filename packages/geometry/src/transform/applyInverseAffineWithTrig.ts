import type { Point } from "../types/Point";

/**
 * Inverts `applyAffineWithTrig` using pre-computed cos/sin: undoes the
 * translation, then the rotation, then the scale. Pass one cos/sin pair when
 * inverse-transforming many points with the same rotation.
 *
 * @param px - Point x in world space
 * @param py - Point y in world space
 * @param sx - Horizontal scale that was applied; must not be 0
 * @param sy - Vertical scale that was applied; must not be 0
 * @param cosAngle - `Math.cos` of the rotation angle that was applied
 * @param sinAngle - `Math.sin` of the same angle, unnegated
 * @param tx - Translation x that was applied
 * @param ty - Translation y that was applied
 * @returns The point in local space (origin at the shape center)
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
