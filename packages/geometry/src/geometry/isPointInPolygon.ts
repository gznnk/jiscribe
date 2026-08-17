import { calcDistanceToSegment } from "./calcDistanceToSegment";
import { EPSILON } from "../constants/EPSILON";
import type { Point } from "../types/Point";

/**
 * Whether a point lies inside a closed polygon, by the even-odd rule: for a
 * self-intersecting outline the overlap counts as outside, which is how the
 * browser fills a path with the default `fill-rule`.
 *
 * @param point - The point to test, in the same coordinate space as the polygon
 * @param polygon - Vertices of a closed polygon; the last is joined back to the
 *   first. Fewer than 3 vertices enclose nothing and always yield false
 * @returns True when the point is inside or on an edge (an edge is inside, so
 *   two polygons sharing an edge both claim a point on it)
 */
export const isPointInPolygon = (
	point: Point,
	polygon: readonly Point[],
): boolean => {
	if (polygon.length < 3) {
		return false;
	}

	let isInside = false;
	for (let i = 0, previous = polygon.length - 1; i < polygon.length; i++) {
		const current = polygon[i];
		const before = polygon[previous];
		// Decided first: the crossing count is unreliable exactly on an edge
		// (a vertex is counted by one of its two edges only).
		if (calcDistanceToSegment(point, before, current) < EPSILON) {
			return true;
		}
		// Half-open in y (current side inclusive, before side exclusive) so a
		// horizontal ray through a vertex crosses its two edges once in total.
		if (
			current.y > point.y !== before.y > point.y &&
			point.x <
				current.x +
					((before.x - current.x) * (point.y - current.y)) /
						(before.y - current.y)
		) {
			isInside = !isInside;
		}
		previous = i;
	}
	return isInside;
};
