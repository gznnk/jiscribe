import { calcRotatedPointWithTrig } from "./calcRotatedPointWithTrig";
import type { Point } from "../types/Point";

/** Rotates point `(px, py)` around center `(cx, cy)` by `angleRad`. */
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
