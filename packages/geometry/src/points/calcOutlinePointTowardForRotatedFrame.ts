import { calcRotatedPointWithTrig } from "./calcRotatedPointWithTrig";
import { degreesToRadians } from "../common/degreesToRadians";
import type { Point } from "../types/Point";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Return the intersection point on the frame outline along the ray
 * from frame center toward `toward` (world coord).
 *
 * Returns null if `toward` is inside the frame or if degenerate (toward == center).
 */
export function calcOutlinePointTowardForRotatedFrame(
	frame: TransformedFrame,
	toward: Point,
): Point | null {
	const { cx, cy, width, height, rotation } = frame;

	if (width <= 0 || height <= 0) {
		return null;
	}

	// Fast path: rotation === 0 (the vast majority of shapes) needs no trig —
	// the world offset is already the local offset.
	const isRotated = rotation !== 0;
	let cos = 1;
	let sin = 0;
	let dx = toward.x - cx;
	let dy = toward.y - cy;
	if (isRotated) {
		// Compute cos/sin once and reuse for both rotation directions below.
		const rotationRad = degreesToRadians(rotation);
		cos = Math.cos(rotationRad);
		sin = Math.sin(rotationRad);

		// world -> local (centered, unrotated): rotate `toward` around center by
		// -rotation. cos(-θ)=cos and sin(-θ)=-sin, so we reuse the same cos/sin and
		// keep the local offset as plain numbers (no Point allocation).
		const wx = dx;
		const wy = dy;
		dx = wx * cos + wy * sin;
		dy = -wx * sin + wy * cos;
	}
	if (dx === 0 && dy === 0) {
		return null;
	}

	const hx = width / 2;
	const hy = height / 2;

	// Check if the point is inside the frame
	// In local coordinates: |x| <= hx && |y| <= hy means inside
	if (Math.abs(dx) <= hx && Math.abs(dy) <= hy) {
		return null;
	}

	const eps = 1e-9;
	// Track the smallest positive t (first hit on the ray) and its local hit point
	// directly, avoiding a candidates array and per-candidate objects.
	let bestT = Infinity;
	let bestX = 0;
	let bestY = 0;

	// Intersect with vertical sides x = ±hx
	if (Math.abs(dx) > eps) {
		const t1 = -hx / dx;
		if (t1 > 0 && t1 < bestT) {
			const y = t1 * dy;
			if (y >= -hy - eps && y <= hy + eps) {
				bestT = t1;
				bestX = -hx;
				bestY = y;
			}
		}
		const t2 = hx / dx;
		if (t2 > 0 && t2 < bestT) {
			const y = t2 * dy;
			if (y >= -hy - eps && y <= hy + eps) {
				bestT = t2;
				bestX = hx;
				bestY = y;
			}
		}
	}

	// Intersect with horizontal sides y = ±hy
	if (Math.abs(dy) > eps) {
		const t1 = -hy / dy;
		if (t1 > 0 && t1 < bestT) {
			const x = t1 * dx;
			if (x >= -hx - eps && x <= hx + eps) {
				bestT = t1;
				bestX = x;
				bestY = -hy;
			}
		}
		const t2 = hy / dy;
		if (t2 > 0 && t2 < bestT) {
			const x = t2 * dx;
			if (x >= -hx - eps && x <= hx + eps) {
				bestT = t2;
				bestX = x;
				bestY = hy;
			}
		}
	}

	if (bestT === Infinity) {
		return null;
	}

	// local -> world: rotate the hit point back around center by +rotation.
	if (!isRotated) {
		return { x: cx + bestX, y: cy + bestY };
	}
	return calcRotatedPointWithTrig(cx + bestX, cy + bestY, cx, cy, cos, sin);
}
