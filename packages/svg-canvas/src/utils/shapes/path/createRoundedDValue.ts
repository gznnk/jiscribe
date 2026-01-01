import type { Point } from "@workspace/geometry";

import { trimLineEnd } from "./trimLineEnd";
import { trimLineStart } from "./trimLineStart";
import type { PathPointState } from "../../../types/state/shapes/PathPointState";

/**
 * Creates a rounded path data value (d attribute) from an array of path points.
 * Uses straight lines with rounded corners at each junction point.
 *
 * @param points - Array of path points to create path from
 * @param radius - Corner radius for rounded corners (default: 10)
 * @param startTrim - Amount to trim from the start of the path (default: 0)
 * @param endTrim - Amount to trim from the end of the path (default: 0)
 * @returns SVG path d attribute value with rounded corners
 */
export const createRoundedDValue = (
	points: PathPointState[],
	radius: number = 10,
	startTrim = 0,
	endTrim = 0,
): string => {
	const n = points.length;
	if (n < 2) {
		return "";
	}

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

	let d = `M ${startPoint.x} ${startPoint.y}`;
	let pen: Point = startPoint;

	for (let i = 1; i <= n - 2; i++) {
		const prev =
			i === 1 ? startPoint : { x: points[i - 1].x, y: points[i - 1].y };
		const current = points[i];
		const next = points[i + 1];

		// Calculate vectors from current point to adjacent points
		const toPrev = {
			x: prev.x - current.x,
			y: prev.y - current.y,
		};
		const toNext = {
			x: next.x - current.x,
			y: next.y - current.y,
		};

		// Calculate lengths of vectors
		const toPrevLength = Math.sqrt(toPrev.x * toPrev.x + toPrev.y * toPrev.y);
		const toNextLength = Math.sqrt(toNext.x * toNext.x + toNext.y * toNext.y);

		// Skip if any vector has zero length (identical points)
		if (toPrevLength === 0 || toNextLength === 0) {
			continue;
		}

		// Normalize vectors
		const toPrevNorm = {
			x: toPrev.x / toPrevLength,
			y: toPrev.y / toPrevLength,
		};
		const toNextNorm = {
			x: toNext.x / toNextLength,
			y: toNext.y / toNextLength,
		};

		// Calculate the actual radius to use (limited by segment lengths)
		const maxRadius = Math.min(toPrevLength / 2, toNextLength / 2, radius);

		// Calculate arc start and end points
		const arcStart = {
			x: current.x + toPrevNorm.x * maxRadius,
			y: current.y + toPrevNorm.y * maxRadius,
		};
		const arcEnd = {
			x: current.x + toNextNorm.x * maxRadius,
			y: current.y + toNextNorm.y * maxRadius,
		};

		// Add line to arc start, then arc to arc end
		d += ` L ${arcStart.x} ${arcStart.y}`;
		d += ` Q ${current.x} ${current.y} ${arcEnd.x} ${arcEnd.y}`;
		pen = arcEnd;
	}

	// --- End point with trim
	const rawEnd: Point = { x: points[n - 1].x, y: points[n - 1].y };
	const endPoint = trimLineEnd(pen, rawEnd, endTrim);

	d += ` L ${endPoint.x} ${endPoint.y}`;

	return d;
};
