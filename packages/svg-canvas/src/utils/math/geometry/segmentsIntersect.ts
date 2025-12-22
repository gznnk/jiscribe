import type { Point } from "../../../types/core/Point";

/**
 * Calculates the cross product of two 2D vectors.
 */
const crossProduct = (p: Point, q: Point): number => p.x * q.y - p.y * q.x;

/**
 * Subtracts two 2D points to create a vector.
 */
const subtract = (p: Point, q: Point): Point => ({
	x: p.x - q.x,
	y: p.y - q.y,
});

/**
 * Determines if two line segments intersect.
 * Parallel or colinear lines are always considered non-intersecting.
 * For non-parallel segments, the inclusive flag controls whether touching at endpoints counts as intersection.
 *
 * @param p1 - Starting point of the first line segment
 * @param p2 - Ending point of the first line segment
 * @param q1 - Starting point of the second line segment
 * @param q2 - Ending point of the second line segment
 * @param inclusive - If true, includes intersection at endpoints. Default: true
 * @returns True if the line segments intersect, false otherwise
 */
export const segmentsIntersect = (
	p1: Point,
	p2: Point,
	q1: Point,
	q2: Point,
	inclusive = true,
): boolean => {
	const r = subtract(p2, p1);
	const s = subtract(q2, q1);
	const denominator = crossProduct(r, s);

	if (denominator === 0) return false; // Parallel or colinear → always non-intersecting

	const qp = subtract(q1, p1);
	const t = crossProduct(qp, s) / denominator;
	const u = crossProduct(qp, r) / denominator;

	if (inclusive) {
		return t >= 0 && t <= 1 && u >= 0 && u <= 1;
	}

	return t > 0 && t < 1 && u > 0 && u < 1;
};
