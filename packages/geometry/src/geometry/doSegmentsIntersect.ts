import { doSegmentsIntersectByCoords } from "./doSegmentsIntersectByCoords";
import type { Point } from "../types/Point";

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
export const doSegmentsIntersect = (
	p1: Point,
	p2: Point,
	q1: Point,
	q2: Point,
	inclusive = true,
): boolean =>
	doSegmentsIntersectByCoords(
		p1.x,
		p1.y,
		p2.x,
		p2.y,
		q1.x,
		q1.y,
		q2.x,
		q2.y,
		inclusive,
	);
