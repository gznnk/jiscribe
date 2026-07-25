import { calcRotatedPointWithTrig } from "./calcRotatedPointWithTrig";
import { degreesToRadians } from "../common/degreesToRadians";
import type { Point } from "../types/Point";

/**
 * A world point expressed as a local (centered, unrotated) offset from a rotated
 * shape's center, together with the cos/sin needed to map a local point back to
 * world space via {@link calcWorldPointFromLocalOffset}.
 */
export type LocalOffsetForRotation = {
	/** Offset from the center in local (unrotated) space. */
	dx: number;
	dy: number;
	/** cos/sin of the rotation, reused for the reverse rotation. */
	cos: number;
	sin: number;
	/** When false, the local offset already equals the world offset. */
	isRotated: boolean;
};

/**
 * Converts a world-space `toward` point into a local (centered, unrotated)
 * offset from the shape's center. `rotationDeg === 0` needs no trig.
 */
export function calcLocalOffsetForRotation(
	cx: number,
	cy: number,
	rotationDeg: number,
	toward: Point,
): LocalOffsetForRotation {
	let cos = 1;
	let sin = 0;
	let dx = toward.x - cx;
	let dy = toward.y - cy;
	const isRotated = rotationDeg !== 0;
	if (isRotated) {
		const rotationRad = degreesToRadians(rotationDeg);
		cos = Math.cos(rotationRad);
		sin = Math.sin(rotationRad);

		// world -> local: rotate by -rotation. cos(-θ)=cos and sin(-θ)=-sin, so one
		// cos/sin pair serves both directions and no Point is allocated.
		const wx = dx;
		const wy = dy;
		dx = wx * cos + wy * sin;
		dy = -wx * sin + wy * cos;
	}
	return { dx, dy, cos, sin, isRotated };
}

/**
 * Maps a local (centered, unrotated) point back to world space, inverting
 * {@link calcLocalOffsetForRotation}. Unrotated shapes skip the trig.
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
	return calcRotatedPointWithTrig(
		cx + localX,
		cy + localY,
		cx,
		cy,
		offset.cos,
		offset.sin,
	);
}
