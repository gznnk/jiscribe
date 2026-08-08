import { doSegmentsIntersectByCoords } from "./doSegmentsIntersectByCoords";
import type { Point } from "../types/Point";

/**
 * Whether two line segments intersect. Parallel and colinear segments never
 * intersect; otherwise `inclusive` decides whether touching at an endpoint
 * counts as an intersection.
 *
 * @param p1 - Start of the first segment
 * @param p2 - End of the first segment
 * @param q1 - Start of the second segment
 * @param q2 - End of the second segment
 * @param inclusive - Whether a touch at an endpoint counts as an intersection
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
