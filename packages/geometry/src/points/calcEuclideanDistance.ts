/**
 * Euclidean distance between two points.
 *
 * @param x1 - First point x
 * @param y1 - First point y
 * @param x2 - Second point x
 * @param y2 - Second point y
 */
export const calcEuclideanDistance = (
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): number => {
	return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};
