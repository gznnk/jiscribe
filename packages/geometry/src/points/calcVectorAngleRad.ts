/**
 * Calculates the angle (in radians) of the vector from an origin toward a point.
 * Uses standard trigonometry (0 radians = 3 o'clock/Right).
 *
 * @param px - X-coordinate of the target point
 * @param py - Y-coordinate of the target point
 * @param ox - X-coordinate of the origin point
 * @param oy - Y-coordinate of the origin point
 * @returns The angle in radians (-π to π)
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
