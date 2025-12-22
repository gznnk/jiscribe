import type { Point } from "../../../types/core/Point";

/**
 * Removes duplicate points from a list of points.
 *
 * @param list - The list of points to process
 * @returns A new list with duplicate points removed
 */
export const removeDuplicatePoints = (list: Point[]): Point[] => {
	const uniquePoints: Point[] = [];
	const seen = new Set<string>();
	for (const point of list) {
		const key = `${point.x},${point.y}`;
		if (!seen.has(key)) {
			uniquePoints.push(point);
			seen.add(key);
		}
	}
	return uniquePoints;
};
