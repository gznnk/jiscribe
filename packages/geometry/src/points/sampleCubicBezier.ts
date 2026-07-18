import type { Point } from "../types/Point";

/**
 * Samples points along a cubic Bézier curve over t ∈ [0, 1] (both endpoints
 * inclusive). Returns `segments + 1` points.
 */
export function sampleCubicBezier(
	p0: Point,
	control1: Point,
	control2: Point,
	p3: Point,
	segments: number,
): Point[] {
	const points: Point[] = [];
	for (let i = 0; i <= segments; i++) {
		const t = i / segments;
		const mt = 1 - t;
		const a = mt * mt * mt;
		const b = 3 * mt * mt * t;
		const c = 3 * mt * t * t;
		const d = t * t * t;
		points.push({
			x: a * p0.x + b * control1.x + c * control2.x + d * p3.x,
			y: a * p0.y + b * control1.y + c * control2.y + d * p3.y,
		});
	}
	return points;
}
