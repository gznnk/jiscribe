import { EPSILON } from "../constants/EPSILON";
import type { Point } from "../types/Point";

/**
 * Perpendicular projection of `point` onto the infinite line through
 * `lineStart` and `lineEnd`. The result is not clamped to the segment; a
 * degenerate line returns `lineStart`.
 */
export const calcProjectedPointOnLine = (
	point: Point,
	lineStart: Point,
	lineEnd: Point,
): Point => {
	const dx = lineEnd.x - lineStart.x;
	const dy = lineEnd.y - lineStart.y;
	const lenSq = dx * dx + dy * dy;
	if (lenSq < EPSILON) {
		return { x: lineStart.x, y: lineStart.y };
	}
	const t =
		((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq;
	return { x: lineStart.x + t * dx, y: lineStart.y + t * dy };
};
