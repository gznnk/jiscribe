import { closerPoint } from "./closerPoint";
import type { Point } from "../../../types/core/Point";

/**
 * Calculates the closest intersection point between a circle and a line.
 * Given a circle and a point, finds the intersection point of the circle with the line
 * connecting the circle's center and the point, that is closest to the given point.
 *
 * @param cx - X-coordinate of the circle center
 * @param cy - Y-coordinate of the circle center
 * @param r - Radius of the circle
 * @param px - X-coordinate of the reference point
 * @param py - Y-coordinate of the reference point
 * @returns The intersection point closest to the reference point
 */
export const calcClosestCircleIntersection = (
	cx: number,
	cy: number,
	r: number,
	px: number,
	py: number,
): Point => {
	const dx = px - cx;
	const dy = py - cy;
	const dist = Math.sqrt(dx * dx + dy * dy);
	// If the arbitrary point coincides with the center of the circle
	if (dist === 0) {
		return { x: cx + r, y: cy }; // Return a point on the circle with radian 0
	}

	// When the line connecting the center of the circle and the arbitrary point intersects the circumference
	const a = (r * dx) / dist;
	const b = (r * dy) / dist;

	// Return the intersection point closer to the arbitrary point
	return closerPoint(px, py, cx + a, cy + b, cx - a, cy - b);
};
