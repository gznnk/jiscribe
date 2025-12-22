import type { Point } from "../../../types/core/Point";

/**
 * Checks if three points are in a straight line.
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @param p3 - Third point
 * @returns True if the three points are in a straight line
 */
export const isStraight = (p1: Point, p2: Point, p3: Point): boolean => {
	return (p1.x === p2.x && p2.x === p3.x) || (p1.y === p2.y && p2.y === p3.y);
};
