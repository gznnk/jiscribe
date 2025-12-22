import type { Point } from "../../../types/core/Point";

/**
 * Calculates the closest intersection point between a line and horizontal/vertical lines.
 * @param a - Slope of the line
 * @param b - Y-intercept of the line
 * @param p1 - Reference point for degenerate cases
 * @param x - X coordinate to check
 * @param y - Y coordinate to check
 * @returns The closest intersection point
 */
export const calculateClosestIntersection = (
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
