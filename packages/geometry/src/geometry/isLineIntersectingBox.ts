import { doSegmentsIntersect } from "./doSegmentsIntersect";
import type { BoxFeatures } from "../types/BoxFeatures";
import type { Point } from "../types/Point";

/**
 * Determines if a line segment intersects with a box.
 *
 * @param p1 - Starting point of the line segment
 * @param p2 - Ending point of the line segment
 * @param box - The box features to check for intersection
 * @returns True if the line segment intersects the box, false otherwise
 */
export const isLineIntersectingBox = (
	p1: Point,
	p2: Point,
	box: BoxFeatures,
): boolean => {
	const boxEdges: [Point, Point][] = [
		[
			{ x: box.left, y: box.top },
			{ x: box.right, y: box.top },
		], // Top edge
		[
			{ x: box.right, y: box.top },
			{ x: box.right, y: box.bottom },
		], // Right edge
		[
			{ x: box.right, y: box.bottom },
			{ x: box.left, y: box.bottom },
		], // Bottom edge
		[
			{ x: box.left, y: box.bottom },
			{ x: box.left, y: box.top },
		], // Left edge
	];

	return boxEdges.some(([q1, q2]) =>
		doSegmentsIntersect(p1, p2, q1, q2, false),
	);
};
