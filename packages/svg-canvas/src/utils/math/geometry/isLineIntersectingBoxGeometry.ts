import { segmentsIntersect } from "./segmentsIntersect";
import type { BoxGeometry } from "../../../types/core/BoxGeometry";
import type { Point } from "../../../types/core/Point";

/**
 * Determines if a line segment intersects with a box geometry.
 *
 * @param p1 - Starting point of the line segment
 * @param p2 - Ending point of the line segment
 * @param boxGeometry - The box geometry to check for intersection
 * @returns True if the line segment intersects the box geometry, false otherwise
 */
export const isLineIntersectingBoxGeometry = (
	p1: Point,
	p2: Point,
	boxGeometry: BoxGeometry,
): boolean => {
	const boxEdges: [Point, Point][] = [
		[
			{ x: boxGeometry.left, y: boxGeometry.top },
			{ x: boxGeometry.right, y: boxGeometry.top },
		], // Top edge
		[
			{ x: boxGeometry.right, y: boxGeometry.top },
			{ x: boxGeometry.right, y: boxGeometry.bottom },
		], // Right edge
		[
			{ x: boxGeometry.right, y: boxGeometry.bottom },
			{ x: boxGeometry.left, y: boxGeometry.bottom },
		], // Bottom edge
		[
			{ x: boxGeometry.left, y: boxGeometry.bottom },
			{ x: boxGeometry.left, y: boxGeometry.top },
		], // Left edge
	];

	return boxEdges.some(([q1, q2]) => segmentsIntersect(p1, p2, q1, q2, false));
};
