import type { Point } from "@workspace/geometry";

/** Consecutive points closer than this distance (px) are treated as identical and collapsed. */
const COINCIDENT_EPSILON = 0.5;

/**
 * Returns a new point list with consecutive nearly-identical points collapsed.
 *
 * In polyline connectors, stale waypoints (such as endpoint coordinates written by
 * an older version) can overlap an endpoint. Drawing them as-is produces zero-length
 * segments and degenerates the arrow angle at the end. Points within `COINCIDENT_EPSILON`
 * of the previous point are dropped, restoring the effective polyline (a straight line
 * in the overlapping case).
 *
 * Because only the immediately preceding point is compared, a point that moves away and
 * later returns to the same coordinate is not collapsed and remains.
 * The input is not mutated; each point is returned as a freshly cloned object.
 */
export const dedupePoints = (points: readonly Point[]): Point[] => {
	const result: Point[] = [];
	for (const p of points) {
		const last = result[result.length - 1];
		if (!last || Math.hypot(p.x - last.x, p.y - last.y) > COINCIDENT_EPSILON) {
			result.push({ x: p.x, y: p.y });
		}
	}
	return result;
};
