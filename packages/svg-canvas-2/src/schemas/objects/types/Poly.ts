import type { Point } from "@workspace/geometry/src/types/Point";

/**
 * Poly shape defined by an array of points.
 * Used for polyline and polygon.
 */
export type Poly = {
	points: Point[];
};
