/**
 * Manhattan distance between two points.
 * Cheaper than `calcEuclideanDistance` and exact for axis-aligned segments.
 */
export const calcManhattanDistance = (
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): number => {
	return Math.abs(x2 - x1) + Math.abs(y2 - y1);
};
