import type { Point } from "@workspace/geometry";

/**
 * Client distance between the two pinch touches.
 *
 * @param points - The pinch's pointerId -> client position map; must hold exactly
 *   the two active touches.
 */
export const calcPinchDist = (points: Map<number, Point>): number => {
	const [p1, p2] = [...points.values()];
	return Math.hypot(p2.x - p1.x, p2.y - p1.y);
};
