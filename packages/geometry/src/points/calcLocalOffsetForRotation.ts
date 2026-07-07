import { calcRotatedPointWithTrig } from "./calcRotatedPointWithTrig";
import { degreesToRadians } from "../common/degreesToRadians";
import type { Point } from "../types/Point";

/**
 * World `toward` point expressed as a local (centered, unrotated) offset from a
 * rotated shape's center, plus the trig values needed to map a resulting local
 * point back to world space via {@link calcWorldPointFromLocalOffset}.
 */
export type LocalOffsetForRotation = {
	/** Local (centered, unrotated) offset from center. */
	dx: number;
	dy: number;
	/** Pre-computed cos/sin of the rotation, reused for the reverse rotation. */
	cos: number;
	sin: number;
	/** Whether rotation is non-zero. When false, world offset equals local offset. */
	isRotated: boolean;
};

/**
 * Convert a world-space `toward` point into a local (centered, unrotated) offset
 * from the shape's center.
 *
 * Fast path: rotation === 0 (the vast majority of shapes) needs no trig — the
 * world offset is already the local offset, so cos/sin default to 1/0.
 */
export function calcLocalOffsetForRotation(
	cx: number,
	cy: number,
	rotation: number,
	toward: Point,
): LocalOffsetForRotation {
	let cos = 1;
	let sin = 0;
	let dx = toward.x - cx;
	let dy = toward.y - cy;
	const isRotated = rotation !== 0;
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
	return { dx, dy, cos, sin, isRotated };
}

/**
 * Map a local (centered, unrotated) point back to world space, inverting the
 * transform of {@link calcLocalOffsetForRotation}.
 *
 * Fast path: when the shape is not rotated, skip the trig and just translate.
 */
export function calcWorldPointFromLocalOffset(
	cx: number,
	cy: number,
	localX: number,
	localY: number,
	offset: Pick<LocalOffsetForRotation, "cos" | "sin" | "isRotated">,
): Point {
	if (!offset.isRotated) {
		return { x: cx + localX, y: cy + localY };
	}
	// local -> world: rotate the local point back around center by +rotation.
	return calcRotatedPointWithTrig(
		cx + localX,
		cy + localY,
		cx,
		cy,
		offset.cos,
		offset.sin,
	);
}
