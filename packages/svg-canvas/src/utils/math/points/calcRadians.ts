/**
 * Calculates the angle between two points in radians.
 * Uses 12 o'clock as 0 radians and proceeds clockwise.
 *
 * @param ox - X-coordinate of the origin point
 * @param oy - Y-coordinate of the origin point
 * @param px - X-coordinate of the target point
 * @param py - Y-coordinate of the target point
 * @returns The angle in radians (0 to 2π)
 */
export const calcRadians = (
	ox: number,
	oy: number,
	px: number,
	py: number,
): number => {
	const dx = px - ox;
	const dy = oy - py; // Invert to make y-axis positive direction upward

	let angle = Math.atan2(dx, dy); // Use (x, y) instead of atan2(y, x) to base on 12 o'clock

	if (angle < 0) {
		angle += 2 * Math.PI; // Convert to range 0 ~ 2π
	}

	return angle;
};
