import { calcEuclideanDistance } from "./calcEuclideanDistance";
import type { Point } from "../../../types/core/Point";

/**
 * Returns the point (from two options) that is closer to a reference point.
 *
 * @param px - X-coordinate of the reference point
 * @param py - Y-coordinate of the reference point
 * @param ax - X-coordinate of the first comparison point
 * @param ay - Y-coordinate of the first comparison point
 * @param bx - X-coordinate of the second comparison point
 * @param by - Y-coordinate of the second comparison point
 * @returns The point (either A or B) that is closer to the reference point
 */
export const closerPoint = (
	px: number,
	py: number,
	ax: number,
	ay: number,
	bx: number,
	by: number,
): Point => {
	const distanceA = calcEuclideanDistance(px, py, ax, ay);
	const distanceB = calcEuclideanDistance(px, py, bx, by);

	return distanceA < distanceB ? { x: ax, y: ay } : { x: bx, y: by };
};
