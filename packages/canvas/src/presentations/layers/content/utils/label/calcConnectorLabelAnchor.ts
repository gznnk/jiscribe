import { calcEuclideanDistance, type Point } from "@workspace/geometry";

/**
 * Computes the label anchor coordinates along a polyline (resolved connector
 * path).
 *
 * `position` is a ratio over the path length (0 = source end, 1 = target end,
 * default 0.5 = midpoint). `offset` is a signed perpendicular distance (world
 * units, default 0) that is positive toward the left of the path's direction
 * of travel ((-dy, dx)). Storing it as a ratio keeps the label attached to the
 * line even when the path changes on an orthogonal-routing recomputation.
 *
 * @param points Resolved coordinate list in source → ...waypoints → target
 *   order (at least 2 points)
 */
export const calcConnectorLabelAnchor = (
	points: readonly Point[],
	position = 0.5,
	offset = 0,
): Point | null => {
	if (points.length < 2) {
		return points.length === 1 ? { ...points[0] } : null;
	}

	// Compute each segment length and the total length.
	const segmentLengths: number[] = [];
	let totalLength = 0;
	for (let i = 0; i < points.length - 1; i++) {
		const length = calcEuclideanDistance(
			points[i].x,
			points[i].y,
			points[i + 1].x,
			points[i + 1].y,
		);
		segmentLengths.push(length);
		totalLength += length;
	}

	// A degenerate path (total length 0) returns the start point.
	if (totalLength === 0) {
		return { ...points[0] };
	}

	const clampedPosition = Math.min(1, Math.max(0, position));
	let remaining = clampedPosition * totalLength;

	// Consume `remaining` to locate the target segment and interpolation position.
	let segmentIndex = 0;
	while (
		segmentIndex < segmentLengths.length - 1 &&
		remaining > segmentLengths[segmentIndex]
	) {
		remaining -= segmentLengths[segmentIndex];
		segmentIndex += 1;
	}

	const start = points[segmentIndex];
	const end = points[segmentIndex + 1];
	const segmentLength = segmentLengths[segmentIndex];
	const ratio = segmentLength === 0 ? 0 : remaining / segmentLength;

	const x = start.x + (end.x - start.x) * ratio;
	const y = start.y + (end.y - start.y) * ratio;

	if (offset === 0 || segmentLength === 0) {
		return { x, y };
	}

	// Normalize the left-facing normal (-dy, dx) of the direction of travel and apply the offset.
	const dirX = (end.x - start.x) / segmentLength;
	const dirY = (end.y - start.y) / segmentLength;
	return { x: x - dirY * offset, y: y + dirX * offset };
};
