import { trimLineEnd } from "./trimLineEnd";
import { trimLineStart } from "./trimLineStart";
import type { Point } from "../../../types/core/Point";
import type { Diagram } from "../../../types/state/core/Diagram";

/**
 * Creates a path data value (d attribute) from an array of diagram items.
 *
 * @param items - Array of diagram items to create path from
 * @param startTrim - Amount to trim from the start of the path (default: 0)
 * @param endTrim - Amount to trim from the end of the path (default: 0)
 * @returns SVG path d attribute value
 */
export const createDValue = (
	items: Diagram[],
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

	// --- Start point with trim
	const rawStart: Point = { x: items[0].x, y: items[0].y };
	const startDir: Point = { x: items[1].x, y: items[1].y };
	const startPoint = trimLineStart(rawStart, startDir, startTrim);

	let d = `M ${startPoint.x} ${startPoint.y} `;

	// --- Middle points
	for (let i = 1; i < n - 1; i++) {
		const item = items[i];
		d += `L ${item.x} ${item.y} `;
	}

	// --- End point with trim
	const pen: Point = { x: items[n - 2].x, y: items[n - 2].y };
	const rawEnd: Point = { x: items[n - 1].x, y: items[n - 1].y };
	const endPoint = trimLineEnd(pen, rawEnd, endTrim);

	d += `L ${endPoint.x} ${endPoint.y}`;

	return d;
};
