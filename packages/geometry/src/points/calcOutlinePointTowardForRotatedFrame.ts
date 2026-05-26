import { calcRotatedPoint } from "./calcRotatedPoint";
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

	// Convert rotation from degrees to radians
	const rotationRad = degreesToRadians(rotation);

	// world -> local (centered, unrotated)
	// Rotate the target point around the center by -rotation
	const towardLocal = calcRotatedPoint(
		toward.x,
		toward.y,
		cx,
		cy,
		-rotationRad,
	);

	const dx = towardLocal.x - cx;
	const dy = towardLocal.y - cy;
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
	const candidates: { t: number; p: Point }[] = [];

	// Intersect with vertical sides x = ±hx
	if (Math.abs(dx) > eps) {
		const t1 = -hx / dx;
		if (t1 > 0) {
			const y = t1 * dy;
			if (y >= -hy - eps && y <= hy + eps) {
				candidates.push({ t: t1, p: { x: -hx, y } });
			}
		}
		const t2 = hx / dx;
		if (t2 > 0) {
			const y = t2 * dy;
			if (y >= -hy - eps && y <= hy + eps) {
				candidates.push({ t: t2, p: { x: hx, y } });
			}
		}
	}

	// Intersect with horizontal sides y = ±hy
	if (Math.abs(dy) > eps) {
		const t1 = -hy / dy;
		if (t1 > 0) {
			const x = t1 * dx;
			if (x >= -hx - eps && x <= hx + eps) {
				candidates.push({ t: t1, p: { x, y: -hy } });
			}
		}
		const t2 = hy / dy;
		if (t2 > 0) {
			const x = t2 * dx;
			if (x >= -hx - eps && x <= hx + eps) {
				candidates.push({ t: t2, p: { x, y: hy } });
			}
		}
	}

	// pick smallest positive t (first hit on the ray)
	let best = candidates[0];
	for (const c of candidates) {
		if (!best || c.t < best.t) {
			best = c;
		}
	}
	if (!best) {
		return null;
	}

	// local -> world
	// The best.p is in local coordinates (offset from center)
	// We need to rotate it back and add to center
	const localPoint = { x: cx + best.p.x, y: cy + best.p.y };
	return calcRotatedPoint(localPoint.x, localPoint.y, cx, cy, rotationRad);
}
