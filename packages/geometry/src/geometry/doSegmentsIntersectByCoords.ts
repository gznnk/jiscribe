import { EPSILON } from "../constants/EPSILON";

/**
 * Coordinate-based segment intersection test: the computation core of
 * `doSegmentsIntersect`, allocating no Point. Hot paths (the four-edge
 * test in `isLineIntersectingBox`, connector re-routing) call it directly.
 *
 * Parallel and colinear segments never intersect. Otherwise `inclusive`
 * decides whether touching at an endpoint counts as an intersection.
 */
export const doSegmentsIntersectByCoords = (
	p1x: number,
	p1y: number,
	p2x: number,
	p2y: number,
	q1x: number,
	q1y: number,
	q2x: number,
	q2y: number,
	inclusive: boolean,
): boolean => {
	const rx = p2x - p1x;
	const ry = p2y - p1y;
	const sx = q2x - q1x;
	const sy = q2y - q1y;
	const denominator = rx * sy - ry * sx;

	// Parallel or colinear
	if (Math.abs(denominator) < EPSILON) {
		return false;
	}

	const qpx = q1x - p1x;
	const qpy = q1y - p1y;
	const t = (qpx * sy - qpy * sx) / denominator;
	const u = (qpx * ry - qpy * rx) / denominator;

	if (inclusive) {
		return t >= 0 && t <= 1 && u >= 0 && u <= 1;
	}

	return t > 0 && t < 1 && u > 0 && u < 1;
};
