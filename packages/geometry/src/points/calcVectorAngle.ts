/**
 * Calculates the angle between two points (vector angle).
 * Uses standard trigonometry (0 radians = 3 o'clock/Right).
 *
 * @param ox - X-coordinate of the origin point
 * @param oy - Y-coordinate of the origin point
 * @param px - X-coordinate of the target point
 * @param py - Y-coordinate of the target point
 * @returns The angle in radians (-π to π)
 */
export const calcVectorAngle = (
	ox: number,
	oy: number,
	px: number,
	py: number,
): number => {
	const dx = px - ox;
	const dy = py - oy;

	return Math.atan2(dy, dx);
};
