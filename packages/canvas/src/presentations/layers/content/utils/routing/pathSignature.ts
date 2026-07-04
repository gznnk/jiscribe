import type { Point } from "@workspace/geometry";

/**
 * Encodes an orthogonal path's **topology** as a string of segment directions
 * (`R` / `L` / `D` / `U`, e.g. an S-shape exiting right is `"RDR"`).
 *
 * The signature ignores coordinates, so it stays identical while a route keeps its shape and only
 * stretches with the shapes' movement, and changes exactly when the route's bend structure changes
 * (e.g. wrapping over the top vs. under the bottom). The router uses its alphabetical order as an
 * intrinsic tie-breaking key: exact cost ties are decided by the route's own shape instead of by
 * candidate enumeration order, which keeps the pick stable while shapes move (see `compareRouteChoices`).
 *
 * Zero-length segments are skipped defensively (normally `simplifyPath` has already collapsed them).
 * Non-axis-aligned segments do not occur in orthogonal paths; if one appears, the dominant axis is used.
 *
 * @param points - The orthogonal path's point sequence (full path including endpoints)
 * @returns The concatenated segment directions (empty string for a path with fewer than 2 points)
 */
export const calcPathSignature = (points: Point[]): string => {
	let signature = "";
	for (let i = 1; i < points.length; i++) {
		const dx = points[i].x - points[i - 1].x;
		const dy = points[i].y - points[i - 1].y;
		if (dx === 0 && dy === 0) {
			continue;
		}
		if (Math.abs(dx) >= Math.abs(dy)) {
			signature += dx > 0 ? "R" : "L";
		} else {
			signature += dy > 0 ? "D" : "U";
		}
	}
	return signature;
};
