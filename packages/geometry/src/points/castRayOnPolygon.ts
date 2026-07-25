import { EPSILON } from "../constants/EPSILON";
import type { Point } from "../types/Point";

/**
 * Nearest forward hit of a ray against a closed polygon, in whatever coordinate
 * space both are given in.
 *
 * @param polygon - Vertices of a closed polygon; the last is joined back to the
 *   first. An empty array yields null
 * @param originX - Ray origin x. An origin lying on an edge does not hit that
 *   edge — the ray travels on past it
 * @param originY - Ray origin y
 * @param dirX - Ray direction x. Not required to be normalized
 * @param dirY - Ray direction y
 * @returns The crossing nearest the origin, only ahead of it along the
 *   direction, or null if the direction is zero or no edge is crossed
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
