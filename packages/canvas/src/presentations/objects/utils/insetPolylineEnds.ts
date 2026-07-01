import type { Point } from "@workspace/geometry";

/**
 * Shrink both ends of a polyline/line segment inward to meet the base of the arrowhead.
 *
 * Returns a new point list where the first point is moved by `startInset` toward the
 * second point, and the last point is moved by `endInset` toward the second-to-last
 * point. Each inset is passed as an absolute distance (already scaled). Pass 0 for ends
 * that have no arrowhead or need no shrinking.
 *
 * This keeps the line from passing through the hollow of a hollow arrowhead even when
 * `fill="none"`, and prevents the line from sticking out past the arrow tip by the line
 * width when the stroke is thick. The arrowhead itself is drawn at the original endpoint
 * (tip), so the visible endpoint position does not change.
 *
 * To prevent degeneration (segment reversal), the move distance is clamped so it does not
 * exceed the target segment length. When there are only two points and both ends are inset,
 * the total is distributed proportionally so it does not exceed the segment length.
 */
export const insetPolylineEnds = (
	points: readonly Point[],
	startInset: number,
	endInset: number,
): Point[] => {
	const result = points.map((p) => ({ x: p.x, y: p.y }));

	let clampedStart = Math.max(startInset, 0);
	let clampedEnd = Math.max(endInset, 0);
	if (result.length < 2 || (clampedStart <= 0 && clampedEnd <= 0)) {
		return result;
	}

	const lastIdx = result.length - 1;

	// When shrinking both ends of a two-point segment, they share the same segment, so clamp the total.
	if (result.length === 2) {
		const segmentLength = Math.hypot(
			result[1].x - result[0].x,
			result[1].y - result[0].y,
		);
		const totalInset = clampedStart + clampedEnd;
		if (totalInset > segmentLength && totalInset > 0) {
			clampedStart = (clampedStart / totalInset) * segmentLength;
			clampedEnd = (clampedEnd / totalInset) * segmentLength;
		}
	}

	if (clampedStart > 0) {
		movePointToward(result[0], result[1], clampedStart);
	}
	if (clampedEnd > 0) {
		movePointToward(result[lastIdx], result[lastIdx - 1], clampedEnd);
	}
	return result;
};

/**
 * Move `point` toward `toward` by `distance` (in-place).
 * The move distance is clamped so it does not exceed the segment length.
 */
const movePointToward = (
	point: { x: number; y: number },
	toward: Point,
	distance: number,
): void => {
	const deltaX = toward.x - point.x;
	const deltaY = toward.y - point.y;
	const length = Math.hypot(deltaX, deltaY);
	if (length === 0) {
		return;
	}
	const ratio = Math.min(distance, length) / length;
	point.x += deltaX * ratio;
	point.y += deltaY * ratio;
};
