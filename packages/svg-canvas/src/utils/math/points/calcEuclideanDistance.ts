/**
 * Calculates the Euclidean distance between two points.
 *
 * @param x1 - X-coordinate of the first point
 * @param y1 - Y-coordinate of the first point
 * @param x2 - X-coordinate of the second point
 * @param y2 - Y-coordinate of the second point
 * @returns The distance between the two points
 */
export const calcEuclideanDistance = (
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): number => {
	const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
	return distance;
};
