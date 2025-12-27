import type { Point } from "@workspace/geometry";

import { trimLineEnd } from "./trimLineEnd";
import { trimLineStart } from "./trimLineStart";
import type { PathPointState } from "../../../types/state/shapes/PathPointState";

/**
 * Creates a quadratic Bézier SVG path (`d`) from path points.
 *
 * Structure:
 *   [start stub] → [smooth quadratic segments] → [end stub]
 *
 * Smoothing:
 * - Each intermediate point is used as a quadratic control point.
 * - Each quadratic segment ends at the midpoint to the next point.
 *
 * Trimming:
 * - `startTrim` affects only the start stub direction (P0 → P1).
 * - `endTrim` affects only the final straight segment.
 */
export const createBezierDValue = (
	items: PathPointState[],
	startTrim = 0,
	endTrim = 0,
): string => {
	const n = items.length;
	if (n < 2) return "";

	// --- Two points: a single straight segment
	if (n === 2) {
		const p0: Point = { x: items[0].x, y: items[0].y };
		const p1: Point = { x: items[1].x, y: items[1].y };

		const p0t = trimLineStart(p0, p1, startTrim);
		const p1t = trimLineEnd(p0t, p1, endTrim);

		return `M ${p0t.x} ${p0t.y} L ${p1t.x} ${p1t.y}`;
	}

	// --- Start stub (M)
	const rawStart: Point = { x: items[0].x, y: items[0].y };
	const startDir: Point = { x: items[1].x, y: items[1].y };
	const startPoint = trimLineStart(rawStart, startDir, startTrim);

	let d = `M ${startPoint.x} ${startPoint.y}`;

	// --- Smooth middle (quadratic segments)
	let pen: Point = startPoint;

	for (let i = 1; i <= n - 2; i++) {
		const current = items[i];
		const next = items[i + 1];

		const controlX = current.x;
		const controlY = current.y;

		const endX = (current.x + next.x) / 2;
		const endY = (current.y + next.y) / 2;

		d += ` Q ${controlX} ${controlY} ${endX} ${endY}`;
		pen = { x: endX, y: endY };
	}

	// --- End stub (L)
	const rawEnd: Point = { x: items[n - 1].x, y: items[n - 1].y };
	const endPoint = trimLineEnd(pen, rawEnd, endTrim);

	d += ` L ${endPoint.x} ${endPoint.y}`;

	return d;
};
