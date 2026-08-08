import { calcRotatedPointWithTrig } from "./calcRotatedPointWithTrig";
import type { Point } from "../types/Point";

/**
 * Rotates point `(px, py)` around center `(cx, cy)` by `angleRad`.
 *
 * @param px - X of the point to rotate
 * @param py - Y of the point to rotate
 * @param cx - X of the center to rotate around
 * @param cy - Y of the center to rotate around
 * @param angleRad - Rotation in radians, clockwise in screen coordinates
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
