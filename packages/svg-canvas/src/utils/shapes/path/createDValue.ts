import type { Point } from "@workspace/geometry";

import { trimLineEnd } from "./trimLineEnd";
import { trimLineStart } from "./trimLineStart";
import type { PathPointState } from "../../../types/state/shapes/PathPointState";

/**
 * Creates a path data value (d attribute) from an array of path points.
 *
 * @param points - Array of path points to create path from
 * @param startTrim - Amount to trim from the start of the path (default: 0)
 * @param endTrim - Amount to trim from the end of the path (default: 0)
 * @returns SVG path d attribute value
 */
export const createDValue = (
	points: PathPointState[],
	startTrim = 0,
	endTrim = 0,
): string => {
	const n = points.length;
	if (n < 2) return "";

	// --- Two points: a single straight segment
	if (n === 2) {
		const p0: Point = { x: points[0].x, y: points[0].y };
		const p1: Point = { x: points[1].x, y: points[1].y };

		const p0t = trimLineStart(p0, p1, startTrim);
		const p1t = trimLineEnd(p0t, p1, endTrim);

		return `M ${p0t.x} ${p0t.y} L ${p1t.x} ${p1t.y}`;
	}

	// --- Start point with trim
	const rawStart: Point = { x: points[0].x, y: points[0].y };
	const startDir: Point = { x: points[1].x, y: points[1].y };
	const startPoint = trimLineStart(rawStart, startDir, startTrim);

	let d = `M ${startPoint.x} ${startPoint.y} `;

	// --- Middle points
	for (let i = 1; i < n - 1; i++) {
		const item = points[i];
		d += `L ${item.x} ${item.y} `;
	}

	// --- End point with trim
	const pen: Point = { x: points[n - 2].x, y: points[n - 2].y };
	const rawEnd: Point = { x: points[n - 1].x, y: points[n - 1].y };
	const endPoint = trimLineEnd(pen, rawEnd, endTrim);

	d += `L ${endPoint.x} ${endPoint.y}`;

	return d;
};
