import type { Point } from "@jiscribe/geometry";

/**
 * Converts a list of points into the `points` attribute string
 * (`"x,y x,y ..."`) for an SVG `<polyline>` / `<polygon>`. An empty array returns an empty string.
 */
export const toPointsAttr = (points: readonly Point[]): string =>
	points.map((p) => `${p.x},${p.y}`).join(" ");
