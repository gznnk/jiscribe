import type { BoundingBox } from "../types/BoundingBox";
import type { Point } from "../types/Point";

/**
 * Whether a point lies inside an axis-aligned box or on its edge.
 *
 * @param point - The point, in the box's coordinate space
 * @param box - The box; one whose edges are inverted (`right` left of `left`)
 *   contains no point. A `NaN` coordinate or edge yields false
 */
export const isPointInBoundingBox = (point: Point, box: BoundingBox): boolean =>
	point.x >= box.left &&
	point.x <= box.right &&
	point.y >= box.top &&
	point.y <= box.bottom;
