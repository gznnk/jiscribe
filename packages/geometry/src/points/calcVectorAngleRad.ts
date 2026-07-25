/**
 * Angle of the vector from origin `(ox, oy)` toward point `(px, py)`.
 * Screen coordinates, so 0 points right and the angle grows clockwise.
 *
 * @returns The angle in radians, within (-π, π]
 */
export const calcVectorAngleRad = (
	px: number,
	py: number,
	ox: number,
	oy: number,
): number => {
	const dx = px - ox;
	const dy = py - oy;

	return Math.atan2(dy, dx);
};
