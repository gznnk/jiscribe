import { isArray, isObject } from "@workspace/basic-validators";
import { isPoint } from "@workspace/geometry";
import type { Point } from "@workspace/geometry/src/types/Point";

/**
 * Poly shape defined by an array of points.
 * Used for polyline and polygon.
 */
export type Poly = {
	points: Point[];
};

/**
 * Check if an object is a Poly.
 * Validates that the object has a points array with valid Point objects.
 *
 * @param obj - The object to check
 * @returns True if the object is a Poly, false otherwise
 */
export const isPoly = (obj: unknown): obj is Poly => {
	if (!isObject(obj)) {
		return false;
	}

	if (!("points" in obj)) {
		return false;
	}

	if (!isArray(obj.points)) {
		return false;
	}

	return obj.points.every((point) => isPoint(point));
};
