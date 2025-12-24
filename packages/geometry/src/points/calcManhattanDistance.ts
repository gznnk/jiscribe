/**
 * Calculates Manhattan distance between two points.
 * Optimized for vertical/horizontal line segments (no square root calculation).
 *
 * @param x1 - First point x coordinate
 * @param y1 - First point y coordinate
 * @param x2 - Second point x coordinate
 * @param y2 - Second point y coordinate
 * @returns Manhattan distance between the points
 */
export const calcManhattanDistance = (
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): number => {
	return Math.abs(x2 - x1) + Math.abs(y2 - y1);
};
