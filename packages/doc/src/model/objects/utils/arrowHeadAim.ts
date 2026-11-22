import { calcVectorAngleRad, type Point } from "@jiscribe/geometry";

import { dedupePoints } from "../connector/dedupePoints";

/**
 * The path a line carrying arrowheads is drawn along and its heads are aimed
 * by: the line's points with each run closer than the drawing tells apart
 * collapsed (dedupePoints), so a point lying on an end does not leave that end
 * a zero-length segment to aim along. Each end's head faces away from the
 * path's point next to it (calcArrowHeadRadians).
 *
 * @param points - The line's drawn points in world coordinates, in drawing order (a connector's resolved path, a polyline's points)
 * @returns A fresh list of the points kept, each point dropped that lies within 0.5px of the last point kept; null when fewer than two remain (no points, or every point within 0.5px of the first), where no head can be aimed
 */
export const resolveArrowHeadPath = (
	points: readonly Point[],
): Point[] | null => {
	const arrowHeadPath = dedupePoints(points);
	return arrowHeadPath.length >= 2 ? arrowHeadPath : null;
};

/**
 * The angles the two arrowheads of a line are drawn at, each pointing out of
 * the line through its end.
 *
 * @param path - A non-null return of resolveArrowHeadPath (two points or more, world coordinates); fewer than two throws
 * @returns Radians in [-π, π] (atan2), 0 pointing along +x and π/2 along +y (y down): `startRadians` faces from `path[1]` through `path[0]`, `endRadians` from the second-to-last point through the last
 */
export const calcArrowHeadRadians = (
	path: readonly Point[],
): { startRadians: number; endRadians: number } => {
	const start = path[0];
	const lastIndex = path.length - 1;
	const end = path[lastIndex];
	return {
		startRadians: calcVectorAngleRad(start.x, start.y, path[1].x, path[1].y),
		endRadians: calcVectorAngleRad(
			end.x,
			end.y,
			path[lastIndex - 1].x,
			path[lastIndex - 1].y,
		),
	};
};
