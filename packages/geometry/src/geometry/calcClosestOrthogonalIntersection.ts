import type { Point } from "../types/Point";

/**
 * Calculates the closest orthogonal intersection point between a line and horizontal/vertical lines.
 * Given a line and target coordinates, this function finds intersections with both the vertical
 * and horizontal lines passing through those coordinates, returning whichever is closer.
 *
 * @param a - Slope of the line
 * @param b - Y-intercept of the line
 * @param p1 - Reference point for degenerate cases (when slope is infinite or zero)
 * @param x - X coordinate to check (for vertical line intersection)
 * @param y - Y coordinate to check (for horizontal line intersection)
 * @returns The closest orthogonal intersection point
 */
export const calcClosestOrthogonalIntersection = (
	a: number,
	b: number,
	p1: Point,
	x: number,
	y: number,
): Point => {
	// Calculate intersection with vertical line at x
	const lineY = a * x + b;
	const verticalIntersection = { x, y: lineY };

	// Calculate intersection with horizontal line at y
	const lineX = Number.isFinite(a) && a !== 0 ? (y - b) / a : p1.x;
	const horizontalIntersection = { x: lineX, y };

	// Calculate distances from original point (x, y)
	const verticalDistance = Math.abs(lineY - y);
	const horizontalDistance = Math.abs(lineX - x);

	// Return the closer intersection point
	return verticalDistance <= horizontalDistance
		? verticalIntersection
		: horizontalIntersection;
};
