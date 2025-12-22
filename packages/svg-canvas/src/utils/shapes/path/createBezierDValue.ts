import type { Diagram } from "../../../types/state/core/Diagram";

/**
 * Creates a quadratic Bézier path data value (d attribute) from an array of diagram items.
 * Uses the midpoint between each PathPoint and its neighbors as control points.
 *
 * @param items - Array of diagram items to create path from
 * @returns SVG path d attribute value with quadratic Bézier curves
 */
export const createBezierDValue = (items: Diagram[]): string => {
	if (items.length < 2) {
		return "";
	}

	if (items.length === 2) {
		// For two points, just create a straight line
		return `M ${items[0].x} ${items[0].y} L ${items[1].x} ${items[1].y}`;
	}

	let d = `M ${items[0].x} ${items[0].y}`;

	for (let i = 1; i < items.length; i++) {
		const current = items[i];
		const next = items[i + 1];

		if (i === items.length - 1) {
			// Last point - create a straight line from previous to current
			d += ` L ${current.x} ${current.y}`;
		} else {
			// Calculate control point as the current point itself
			// This creates a quadratic Bézier curve where the current point serves as the control point
			// and the curve passes through the midpoints between prev-current and current-next
			const controlX = current.x;
			const controlY = current.y;

			// Calculate the end point for this curve segment (midpoint to next)
			const endX = (current.x + next.x) / 2;
			const endY = (current.y + next.y) / 2;

			if (i === 1) {
				// First curve segment: start from first point, control at current, end at midpoint to next
				d += ` Q ${controlX} ${controlY} ${endX} ${endY}`;
			} else {
				// Subsequent curve segments: continue from previous end point
				d += ` Q ${controlX} ${controlY} ${endX} ${endY}`;
			}
		}
	}

	return d;
};
