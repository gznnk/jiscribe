import { calcRotatedPointWithTrig } from "./calcRotatedPointWithTrig";
import type { Point } from "../types/Point";

/**
 * Rotates a point around a center point by a given angle.
 *
 * @param px - X-coordinate of the point to rotate
 * @param py - Y-coordinate of the point to rotate
 * @param cx - X-coordinate of the rotation center
 * @param cy - Y-coordinate of the rotation center
 * @param angleRad - Angle of rotation in radians
 * @returns The rotated point
 */
export const calcRotatedPoint = (
	px: number,
	py: number,
	cx: number,
	cy: number,
	angleRad: number,
): Point =>
	calcRotatedPointWithTrig(
		px,
		py,
		cx,
		cy,
		Math.cos(angleRad),
		Math.sin(angleRad),
	);
