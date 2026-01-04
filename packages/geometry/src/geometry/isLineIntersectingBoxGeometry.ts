import { doSegmentsIntersect } from "./doSegmentsIntersect";
import type { BoxFeatures } from "../types/BoxFeatures";
import type { Point } from "../types/Point";

/**
 * Determines if a line segment intersects with a box.
 *
 * @param p1 - Starting point of the line segment
 * @param p2 - Ending point of the line segment
 * @param boxGeometry - The box features to check for intersection
 * @returns True if the line segment intersects the box, false otherwise
 */
export const isLineIntersectingBoxGeometry = (
	p1: Point,
	p2: Point,
	boxGeometry: BoxFeatures,
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

	return boxEdges.some(([q1, q2]) => doSegmentsIntersect(p1, p2, q1, q2, false));
};

