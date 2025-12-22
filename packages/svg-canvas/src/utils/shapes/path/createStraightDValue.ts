import type { Diagram } from "../../../types/state/core/Diagram";

/**
 * Creates a straight path data value (d attribute) from first to last point.
 *
 * @param items - Array of diagram items (only first and last are used)
 * @returns SVG path d attribute value for a straight line
 */
export const createStraightDValue = (items: Diagram[]): string => {
	if (items.length === 0) {
		return "";
	}

	if (items.length === 1) {
		const item = items[0];
		return `M ${item.x} ${item.y}`;
	}

	const first = items[0];
	const last = items[items.length - 1];
	return `M ${first.x} ${first.y} L ${last.x} ${last.y}`;
};
