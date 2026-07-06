import { calcRotatedPointWithTrig } from "./calcRotatedPointWithTrig";
import { degreesToRadians } from "../common/degreesToRadians";
import type { Point } from "../types/Point";
import type { TransformedEllipse } from "../types/TransformedEllipse";

/**
 * Return the intersection point on the ellipse outline along the ray
 * from ellipse center toward `toward` (world coord).
 *
 * Returns null if `toward` is inside the ellipse or if degenerate (toward == center).
 */
export function calcOutlinePointTowardForRotatedEllipse(
	ellipse: TransformedEllipse,
	toward: Point,
): Point | null {
	const { cx, cy, rx, ry, rotation } = ellipse;

	if (rx <= 0 || ry <= 0) {
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

	// Check if the point is inside the ellipse
	// In local coordinates: (x/rx)^2 + (y/ry)^2 <= 1 means inside
	const normalizedDist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
	if (normalizedDist <= 1) {
		return null;
	}

	const denom = Math.sqrt(normalizedDist);
	if (denom === 0) {
		return null;
	}

	// local -> world: scale the offset onto the outline (÷denom) and rotate it
	// back around center by +rotation.
	if (!isRotated) {
		return { x: cx + dx / denom, y: cy + dy / denom };
	}
	return calcRotatedPointWithTrig(
		cx + dx / denom,
		cy + dy / denom,
		cx,
		cy,
		cos,
		sin,
	);
}
