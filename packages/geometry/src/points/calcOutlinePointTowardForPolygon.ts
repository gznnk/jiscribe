import { degreesToRadians } from "../common/degreesToRadians";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
import type { Point } from "../types/Point";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Return the intersection point on a polygon outline along the ray from the
 * shape center toward `toward` (world coord). The polygon is given in local,
 * centered coordinates (width/height units, pre-transform) and transformed to
 * world space with the same affine as the renderer / calcFrameKeyPoint, so the
 * result follows the shape's rotation and flip.
 *
 * Returns null if the ray hits no edge (degenerate polygon, toward == center).
 */
export function calcOutlinePointTowardForPolygon(
	localPolygon: readonly Point[],
	frame: TransformedFrame,
	toward: Point,
): Point | null {
	if (localPolygon.length < 2) {
		return null;
	}
	const { cx, cy, rotation, scaleX, scaleY } = frame;
	const theta = degreesToRadians(rotation);

	const worldPolygon: Point[] = new Array(localPolygon.length);
	for (let i = 0; i < localPolygon.length; i++) {
		const p = localPolygon[i];
		worldPolygon[i] = calcAffineTransformedPoint(
			p.x,
			p.y,
			scaleX,
			scaleY,
			theta,
			cx,
			cy,
		);
	}

	return castRayFromCenter(worldPolygon, cx, cy, toward.x - cx, toward.y - cy);
}

/**
 * Nearest positive-t hit of the ray (origin `cx,cy`, direction `dirX,dirY`)
 * against the closed polygon. Returns null if the direction is degenerate or no
 * edge is crossed.
 */
function castRayFromCenter(
	polygon: readonly Point[],
	cx: number,
	cy: number,
	dirX: number,
	dirY: number,
): Point | null {
	if (dirX === 0 && dirY === 0) {
		return null;
	}

	const eps = 1e-9;
	let bestT = Infinity;
	const n = polygon.length;

	// Ray P = C + t·D (t>0) vs segment Q = A + u·(B-A) (u in [0,1]).
	// denom = D×E, t = (W×E)/denom, u = (W×D)/denom, where W = A-C, E = B-A
	// and a×b = a.x·b.y - a.y·b.x.
	for (let i = 0; i < n; i++) {
		const a = polygon[i];
		const b = polygon[(i + 1) % n];
		const ex = b.x - a.x;
		const ey = b.y - a.y;
		const denom = dirX * ey - dirY * ex;
		if (Math.abs(denom) < eps) {
			// Ray parallel to this edge.
			continue;
		}
		const wx = a.x - cx;
		const wy = a.y - cy;
		const t = (wx * ey - wy * ex) / denom;
		const u = (wx * dirY - wy * dirX) / denom;
		if (t > eps && u >= -eps && u <= 1 + eps && t < bestT) {
			bestT = t;
		}
	}

	if (bestT === Infinity) {
		return null;
	}
	return { x: cx + bestT * dirX, y: cy + bestT * dirY };
}
