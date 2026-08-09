import type { Point } from "@jiscribe/geometry";

/**
 * Client midpoint of the two pinch touches.
 *
 * @param points - The pinch's pointerId -> client position map; must hold exactly
 *   the two active touches.
 */
export const calcPinchMid = (points: Map<number, Point>): Point => {
	const [p1, p2] = [...points.values()];
	return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
};
