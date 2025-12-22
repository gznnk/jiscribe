import type { Diagram } from "../../../types/state/core/Diagram";

/**
 * Creates a rounded path data value (d attribute) from an array of diagram items.
 * Uses straight lines with rounded corners at each junction point.
 *
 * @param items - Array of diagram items to create path from
 * @param radius - Corner radius for rounded corners (default: 10)
 * @returns SVG path d attribute value with rounded corners
 */
export const createRoundedDValue = (
	items: Diagram[],
	radius: number = 10,
): string => {
	if (items.length < 2) {
		return "";
	}

	if (items.length === 2) {
		// For two points, just create a straight line (no corners to round)
		return `M ${items[0].x} ${items[0].y} L ${items[1].x} ${items[1].y}`;
	}

	let d = `M ${items[0].x} ${items[0].y}`;

	for (let i = 1; i < items.length - 1; i++) {
		const prev = items[i - 1];
		const current = items[i];
		const next = items[i + 1];

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
	}

	// Add final line to last point
	const lastPoint = items[items.length - 1];
	d += ` L ${lastPoint.x} ${lastPoint.y}`;

	return d;
};
