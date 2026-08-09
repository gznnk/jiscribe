import type { Point } from "@jiscribe/geometry";

/**
 * Formats an outline point list as an SVG `points` attribute string
 * (`"x,y x,y ..."`). Lets the outline point list stay the single source shared
 * by the renderer/preview (`<polygon>`) and the connector outline calculator.
 */
export const formatPolygonPoints = (points: readonly Point[]): string =>
	points.map((p) => `${p.x},${p.y}`).join(" ");
