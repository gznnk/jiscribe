import { calculateClosestIntersection } from "./calculateClosestIntersection";
import type { Point } from "../../../types/core/Point";

/**
 * Creates a function that returns the closest intersection point between a line and horizontal/vertical lines.
 * The line is defined by two points and the function compares intersections with vertical and horizontal lines
 * passing through the input coordinates, returning the closer intersection point.
 *
 * @param p1 - First point on the line
 * @param p2 - Second point on the line
 * @returns A function that takes (x, y) coordinates and returns the closest intersection point
 */
export const createLinearX2yFunction = (p1: Point, p2: Point) => {
	const a = (p2.y - p1.y) / (p2.x - p1.x);
	const b = p1.y - a * p1.x;

	return (x: number, y: number) => {
		// For horizontal lines (slope = 0), prioritize vertical intersection (X-axis direction)
		if (a === 0) {
			return { x, y: p1.y };
		}
		return calculateClosestIntersection(a, b, p1, x, y);
	};
};
