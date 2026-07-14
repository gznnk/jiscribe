import { degreesToRadians } from "../common/degreesToRadians";
import type { Point } from "../types/Point";

/**
 * Samples points along an elliptical arc (both endpoints inclusive). A point at
 * angle θ is (cx + rx·cos θ, cy + ry·sin θ); angles are in degrees. Returns
 * `segments + 1` points.
 */
export function sampleEllipseArc(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	startDeg: number,
	endDeg: number,
	segments: number,
): Point[] {
	const start = degreesToRadians(startDeg);
	const end = degreesToRadians(endDeg);
	const points: Point[] = [];
	for (let i = 0; i <= segments; i++) {
		const t = start + (end - start) * (i / segments);
		points.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
	}
	return points;
}
