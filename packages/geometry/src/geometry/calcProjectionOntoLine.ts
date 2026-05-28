import type { Point } from "../types/Point";

/**
 * Projects a point onto a line defined by two points (perpendicular projection).
 * Returns the closest point on the line to the given point.
 *
 * @param p1 - First point on the line
 * @param p2 - Second point on the line
 * @param point - The point to project
 * @returns The closest point on the line to `point`
 */
export const calcProjectionOntoLine = (
	p1: Point,
	p2: Point,
	point: Point,
): Point => {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) {
		return { x: p1.x, y: p1.y };
	}
	const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lenSq;
	return { x: p1.x + t * dx, y: p1.y + t * dy };
};
