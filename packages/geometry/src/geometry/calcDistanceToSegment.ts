import { EPSILON } from "../constants/EPSILON";
import type { Point } from "../types/Point";

/**
 * Shortest distance from a point to a line *segment*, which is what a hit test
 * against a drawn line needs — {@link calcProjectedPointOnLine} projects onto
 * the infinite line, so a point far past an end still measures close to it.
 *
 * @param point - The point to measure from
 * @param segmentStart - First endpoint of the segment
 * @param segmentEnd - Second endpoint; equal to `segmentStart` degenerates the
 *   segment to a point, and the distance to that point is returned
 * @returns The distance in the units both were given in; 0 for a point on the
 *   segment
 */
export const calcDistanceToSegment = (
	point: Point,
	segmentStart: Point,
	segmentEnd: Point,
): number => {
	const dx = segmentEnd.x - segmentStart.x;
	const dy = segmentEnd.y - segmentStart.y;
	const lengthSq = dx * dx + dy * dy;
	if (lengthSq < EPSILON) {
		return Math.hypot(point.x - segmentStart.x, point.y - segmentStart.y);
	}
	const projected =
		((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) /
		lengthSq;
	const clamped = Math.min(1, Math.max(0, projected));
	return Math.hypot(
		point.x - (segmentStart.x + clamped * dx),
		point.y - (segmentStart.y + clamped * dy),
	);
};
