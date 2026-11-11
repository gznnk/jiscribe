import type { Point } from "@jiscribe/geometry";

import { isSameCoordinate } from "./coordinate";

/**
 * Drop every point that lies on the straight line between its neighbours. A repeated
 * point lies on that line, so a corner given twice goes altogether; {@link simplifyRoute}
 * is for a path that may repeat one.
 */
export const dropCollinearPoints = (path: readonly Point[]): Point[] =>
	path.filter((point, index) => {
		if (index === 0 || index === path.length - 1) {
			return true;
		}
		const previous = path[index - 1];
		const next = path[index + 1];
		const sameColumn =
			isSameCoordinate(previous.x, point.x) &&
			isSameCoordinate(point.x, next.x);
		const sameRow =
			isSameCoordinate(previous.y, point.y) &&
			isSameCoordinate(point.y, next.y);
		return !(sameColumn || sameRow);
	});

/**
 * Drop each point equal to the one before it, the first of a run staying, then each on
 * the straight line between its neighbours (see dropCollinearPoints).
 */
export const simplifyRoute = (path: readonly Point[]): Point[] =>
	dropCollinearPoints(
		path.filter(
			(point, index) =>
				index === 0 ||
				!(
					isSameCoordinate(point.x, path[index - 1].x) &&
					isSameCoordinate(point.y, path[index - 1].y)
				),
		),
	);
