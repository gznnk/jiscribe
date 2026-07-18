import type { Point } from "../types/Point";

/**
 * Samples points along a quadratic Bézier curve over t ∈ [tStart, tEnd] (both
 * endpoints inclusive; defaults to the full curve). Returns `segments + 1` points.
 */
export function sampleQuadraticBezier(
	p0: Point,
	control: Point,
	p1: Point,
	segments: number,
	tStart = 0,
	tEnd = 1,
): Point[] {
	const points: Point[] = [];
	for (let i = 0; i <= segments; i++) {
		const t = tStart + (tEnd - tStart) * (i / segments);
		const mt = 1 - t;
		points.push({
			x: mt * mt * p0.x + 2 * mt * t * control.x + t * t * p1.x,
			y: mt * mt * p0.y + 2 * mt * t * control.y + t * t * p1.y,
		});
	}
	return points;
}
