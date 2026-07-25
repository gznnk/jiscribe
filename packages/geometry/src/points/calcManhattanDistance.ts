/**
 * Manhattan distance between two points.
 * Cheaper than `calcEuclideanDistance` and exact for axis-aligned segments.
 *
 * @param x1 - First point x
 * @param y1 - First point y
 * @param x2 - Second point x
 * @param y2 - Second point y
 */
export const calcManhattanDistance = (
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): number => {
	return Math.abs(x2 - x1) + Math.abs(y2 - y1);
};
