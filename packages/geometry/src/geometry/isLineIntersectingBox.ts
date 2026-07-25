import { doSegmentsIntersectByCoords } from "./doSegmentsIntersectByCoords";
import type { BoundingBox } from "../types/BoundingBox";
import type { Point } from "../types/Point";

/**
 * Whether a line segment crosses any of a box's four edges. The edge tests are
 * exclusive, so a segment fully contained in the box returns false.
 *
 * `BoxFeatures` is assignable to the `box` parameter.
 */
export const isLineIntersectingBox = (
	p1: Point,
	p2: Point,
	box: BoundingBox,
): boolean => {
	const { left, top, right, bottom } = box;
	const { x: x1, y: y1 } = p1;
	const { x: x2, y: y2 } = p2;

	// Tested as raw coordinates, allocating neither edge tuples nor Points.
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
