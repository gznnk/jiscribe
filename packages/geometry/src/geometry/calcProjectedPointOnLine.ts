import type { Point } from "../types/Point";

/**
 * Projects a point onto a line defined by two points (perpendicular projection).
 * Returns the closest point on the line to the given point.
 *
 * @param point - The point to project
 * @param lineStart - First point on the line
 * @param lineEnd - Second point on the line
 * @returns The closest point on the line to `point`
 */
export const calcProjectedPointOnLine = (
	point: Point,
	lineStart: Point,
	lineEnd: Point,
): Point => {
	const dx = lineEnd.x - lineStart.x;
	const dy = lineEnd.y - lineStart.y;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) {
		return { x: lineStart.x, y: lineStart.y };
	}
	const t =
		((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq;
	return { x: lineStart.x + t * dx, y: lineStart.y + t * dy };
};
