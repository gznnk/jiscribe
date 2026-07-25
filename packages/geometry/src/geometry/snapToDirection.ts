import type { OrthogonalDirection } from "../types/OrthogonalDirection";

/**
 * Snaps the vector `(dx, dy)` to the nearest axis direction, preferring the
 * dominant axis and falling back to horizontal on a tie. Diagonal and zero
 * vectors always resolve to some direction.
 */
export const snapToDirection = (
	dx: number,
	dy: number,
): OrthogonalDirection => {
	if (Math.abs(dx) >= Math.abs(dy)) {
		return dx >= 0 ? "right" : "left";
	}
	return dy >= 0 ? "down" : "up";
};
