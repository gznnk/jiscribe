import { EPSILON } from "../constants/EPSILON";
import type { Point } from "../types/Point";

/**
 * Nearest positive-t hit of the ray (origin `originX,originY`, direction
 * `dirX,dirY`) against a closed polygon. Returns null if the direction is
 * degenerate or no edge is crossed.
 */
export function castRayOnPolygon(
	polygon: readonly Point[],
	originX: number,
	originY: number,
	dirX: number,
	dirY: number,
): Point | null {
	if (dirX === 0 && dirY === 0) {
		return null;
	}

	let bestT = Infinity;
	const n = polygon.length;

	// Ray P = O + t·D (t>0) vs segment Q = A + u·(B-A) (u in [0,1]).
	// denom = D×E, t = (W×E)/denom, u = (W×D)/denom, where W = A-O, E = B-A
	// and a×b = a.x·b.y - a.y·b.x.
	for (let i = 0; i < n; i++) {
		const a = polygon[i];
		const b = polygon[(i + 1) % n];
		const ex = b.x - a.x;
		const ey = b.y - a.y;
		const denom = dirX * ey - dirY * ex;
		if (Math.abs(denom) < EPSILON) {
			// Ray parallel to this edge.
			continue;
		}
		const wx = a.x - originX;
		const wy = a.y - originY;
		const t = (wx * ey - wy * ex) / denom;
		const u = (wx * dirY - wy * dirX) / denom;
		if (t > EPSILON && u >= -EPSILON && u <= 1 + EPSILON && t < bestT) {
			bestT = t;
		}
	}

	if (bestT === Infinity) {
		return null;
	}
	return { x: originX + bestT * dirX, y: originY + bestT * dirY };
}
