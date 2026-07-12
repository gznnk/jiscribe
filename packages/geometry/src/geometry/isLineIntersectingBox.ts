import { doSegmentsIntersectByCoords } from "./doSegmentsIntersectByCoords";
import type { BoundingBox } from "../types/BoundingBox";
import type { Point } from "../types/Point";

/**
 * Determines if a line segment intersects with a box.
 *
 * @param p1 - Starting point of the line segment
 * @param p2 - Ending point of the line segment
 * @param box - The box edges to check for intersection (a `BoundingBox`; `BoxFeatures` is assignable)
 * @returns True if the line segment intersects the box, false otherwise
 */
export const isLineIntersectingBox = (
	p1: Point,
	p2: Point,
	box: BoundingBox,
): boolean => {
	const { left, top, right, bottom } = box;
	const { x: x1, y: y1 } = p1;
	const { x: x2, y: y2 } = p2;

	// 4 辺との交差を、辺タプルや Point を確保せず座標のまま判定する。
	return (
		// Top edge
		doSegmentsIntersectByCoords(x1, y1, x2, y2, left, top, right, top, false) ||
		// Right edge
		doSegmentsIntersectByCoords(
			x1,
			y1,
			x2,
			y2,
			right,
			top,
			right,
			bottom,
			false,
		) ||
		// Bottom edge
		doSegmentsIntersectByCoords(
			x1,
			y1,
			x2,
			y2,
			right,
			bottom,
			left,
			bottom,
			false,
		) ||
		// Left edge
		doSegmentsIntersectByCoords(x1, y1, x2, y2, left, bottom, left, top, false)
	);
};
