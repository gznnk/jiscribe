import {
	calcLocalOffsetForRotation,
	calcWorldPointFromLocalOffset,
} from "./calcLocalOffsetForRotation";
import { EPSILON } from "../constants/EPSILON";
import type { Point } from "../types/Point";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Intersection point on the frame outline along the ray from the frame center
 * toward `toward` (world coordinates).
 *
 * Scale is ignored: it is a `FlipScale`, and a rectangle outline is invariant
 * under axis flips.
 *
 * @param frame - The shape to hit; a non-positive width or height yields null
 * @param toward - World-space point the ray from the center aims at
 * @returns The outline hit, or null if `toward` is inside the frame or is the
 *   center itself
 */
export function calcOutlinePointTowardForRotatedFrame(
	frame: TransformedFrame,
	toward: Point,
): Point | null {
	const { cx, cy, width, height, rotation } = frame;

	if (width <= 0 || height <= 0) {
		return null;
	}

	const offset = calcLocalOffsetForRotation(cx, cy, rotation, toward);
	const { dx, dy } = offset;
	if (dx === 0 && dy === 0) {
		return null;
	}

	const hx = width / 2;
	const hy = height / 2;

	// In local coordinates |x| <= hx && |y| <= hy means inside.
	if (Math.abs(dx) <= hx - EPSILON && Math.abs(dy) <= hy - EPSILON) {
		return null;
	}

	// Track the smallest positive t (first hit on the ray) and its local hit point
	// directly, avoiding a candidates array and per-candidate objects.
	let bestT = Infinity;
	let bestX = 0;
	let bestY = 0;

	// Vertical sides x = ±hx
	if (Math.abs(dx) > EPSILON) {
		const t1 = -hx / dx;
		if (t1 > 0 && t1 < bestT) {
			const y = t1 * dy;
			if (y >= -hy - EPSILON && y <= hy + EPSILON) {
				bestT = t1;
				bestX = -hx;
				bestY = y;
			}
		}
		const t2 = hx / dx;
		if (t2 > 0 && t2 < bestT) {
			const y = t2 * dy;
			if (y >= -hy - EPSILON && y <= hy + EPSILON) {
				bestT = t2;
				bestX = hx;
				bestY = y;
			}
		}
	}

	// Horizontal sides y = ±hy
	if (Math.abs(dy) > EPSILON) {
		const t1 = -hy / dy;
		if (t1 > 0 && t1 < bestT) {
			const x = t1 * dx;
			if (x >= -hx - EPSILON && x <= hx + EPSILON) {
				bestT = t1;
				bestX = x;
				bestY = -hy;
			}
		}
		const t2 = hy / dy;
		if (t2 > 0 && t2 < bestT) {
			const x = t2 * dx;
			if (x >= -hx - EPSILON && x <= hx + EPSILON) {
				bestT = t2;
				bestX = x;
				bestY = hy;
			}
		}
	}

	if (bestT === Infinity) {
		return null;
	}

	return calcWorldPointFromLocalOffset(cx, cy, bestX, bestY, offset);
}
