import type { Point } from "@workspace/geometry";

import { trimLineEnd } from "./trimLineEnd";
import { trimLineStart } from "./trimLineStart";
import type { PathPointState } from "../../../types/state/shapes/PathPointState";

/**
 * Creates a straight path data value (d attribute) from first to last point.
 *
 * @param points - Array of path points (only first and last are used)
 * @param startTrim - Amount to trim from the start of the line (default: 0)
 * @param endTrim - Amount to trim from the end of the line (default: 0)
 * @returns SVG path d attribute value for a straight line
 */
export const createStraightDValue = (
	points: PathPointState[],
	startTrim = 0,
	endTrim = 0,
): string => {
	if (points.length < 2) {
		return "";
	}

	// --- Two points: a single straight segment
	const first: Point = { x: points[0].x, y: points[0].y };
	const last: Point = {
		x: points[points.length - 1].x,
		y: points[points.length - 1].y,
	};

	const startPoint = trimLineStart(first, last, startTrim);
	const endPoint = trimLineEnd(startPoint, last, endTrim);

	return `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
};
