import type { Point } from "@jiscribe/geometry";

/**
 * Formats a point list as the `points` attribute string (`"x,y x,y ..."`) that
 * SVG's `<polygon>` and `<polyline>` share. The ring is not closed; `<polygon>`
 * closes it on its own.
 *
 * @param points - Vertices in the element's own coordinates; an empty list
 * yields an empty string, which SVG reads as nothing to draw
 */
export const formatPolygonPoints = (points: readonly Point[]): string =>
	points.map((p) => `${p.x},${p.y}`).join(" ");
