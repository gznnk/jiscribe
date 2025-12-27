import type { Point } from "@workspace/geometry";

/**
 * Trims the end point of a line segment by `trim` along its direction.
 * The trim amount is clamped to avoid degenerating the segment.
 */
export const trimLineEnd = (from: Point, to: Point, trim: number): Point => {
	if (trim <= 0) return to;

	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const len = Math.hypot(dx, dy);

	if (len <= 1e-6) return to;

	const clamped = Math.min(trim, Math.max(0, len - 1e-3));
	const ux = dx / len;
	const uy = dy / len;

	return { x: to.x - ux * clamped, y: to.y - uy * clamped };
};
