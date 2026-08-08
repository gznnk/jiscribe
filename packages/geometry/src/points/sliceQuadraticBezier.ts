import type { Point } from "../types/Point";

/** A quadratic Bézier curve given by its three control points. */
export type QuadraticBezier = {
	/** Start point of the curve. */
	p0: Point;
	/** Control point both ends are pulled toward. */
	control: Point;
	/** End point of the curve. */
	p1: Point;
};

const calcQuadraticBezierPoint = (
	p0: Point,
	control: Point,
	p1: Point,
	t: number,
): Point => {
	const mt = 1 - t;
	return {
		x: mt * mt * p0.x + 2 * mt * t * control.x + t * t * p1.x,
		y: mt * mt * p0.y + 2 * mt * t * control.y + t * t * p1.y,
	};
};

/**
 * Extracts the part of a quadratic Bézier curve over t ∈ [tStart, tEnd] as a
 * quadratic Bézier of its own, so a partial arc can be drawn exactly instead of
 * being approximated by sampled points (`sampleQuadraticBezier`).
 *
 * @param p0 - Start point of the full curve
 * @param control - Control point both ends of the full curve are pulled toward
 * @param p1 - End point of the full curve
 * @param tStart - Start of the extracted range, as t on the full curve; values outside [0, 1] extrapolate along the same parabola
 * @param tEnd - End of the extracted range, as t on the full curve
 * @returns The extracted curve's own control points; `p0` / `p1` are the full curve evaluated at tStart / tEnd
 */
export function sliceQuadraticBezier(
	p0: Point,
	control: Point,
	p1: Point,
	tStart: number,
	tEnd: number,
): QuadraticBezier {
	// The extracted curve's control point is where the tangents at its two ends
	// meet, which expanding de Casteljau at both ends gives as this weighting.
	const mtStart = 1 - tStart;
	const mtEnd = 1 - tEnd;
	return {
		p0: calcQuadraticBezierPoint(p0, control, p1, tStart),
		control: {
			x:
				mtStart * mtEnd * p0.x +
				(mtStart * tEnd + mtEnd * tStart) * control.x +
				tStart * tEnd * p1.x,
			y:
				mtStart * mtEnd * p0.y +
				(mtStart * tEnd + mtEnd * tStart) * control.y +
				tStart * tEnd * p1.y,
		},
		p1: calcQuadraticBezierPoint(p0, control, p1, tEnd),
	};
}
