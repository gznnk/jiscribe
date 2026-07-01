import type { Point } from "@workspace/geometry";

/**
 * Collapse duplicate points and collinear "pass-through" intermediate points.
 * Points that reverse direction (backtrack) are not collapsed—to preserve the stub's push-out
 * direction, an intermediate point is removed only when it lies between its neighbors (monotonic).
 *
 * @param points - The point list of the orthogonal path (including endpoints)
 * @returns The point list with duplicate and pass-through points collapsed (endpoints and backtrack points preserved)
 */
export const simplifyPath = (points: Point[]): Point[] => {
	// Pass 1: drop consecutive duplicate points (eliminate zero-length segments).
	const dedup: Point[] = [];
	for (const p of points) {
		const last = dedup[dedup.length - 1];
		if (!last || last.x !== p.x || last.y !== p.y) {
			dedup.push({ x: p.x, y: p.y });
		}
	}
	if (dedup.length <= 2) {
		return dedup;
	}
	// Pass 2: drop collinear intermediate points b to minimize the number of corners.
	// Endpoints (first/last) are always kept; b is dropped only when it is collinear with its neighbors a and c.
	const out: Point[] = [dedup[0]];
	for (let i = 1; i < dedup.length - 1; i++) {
		const a = out[out.length - 1];
		const b = dedup[i];
		const c = dedup[i + 1];
		// "Monotonic collinear" = on the same axis, b points in the same direction as a→c (does not backtrack).
		// Monotonic if the signs of (b - a) and (c - b) match (product >= 0). Backtrack points are kept, not collapsed
		// —to preserve the stub's push-out direction (collapsing would erase the exit direction, creating a corner that turns back into the shape).
		const monotonicH =
			a.y === b.y && b.y === c.y && (b.x - a.x) * (c.x - b.x) >= 0;
		const monotonicV =
			a.x === b.x && b.x === c.x && (b.y - a.y) * (c.y - b.y) >= 0;
		if (!monotonicH && !monotonicV) {
			out.push(b);
		}
	}
	out.push(dedup[dedup.length - 1]);
	return out;
};
