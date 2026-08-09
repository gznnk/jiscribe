import { calcEuclideanDistance, type Point } from "@jiscribe/geometry";

/** Label placement along a connector path, in the units `calcConnectorLabelAnchor` consumes. */
export type ConnectorLabelPlacement = {
	/** Ratio over the path length, 0 (source) to 1 (target). */
	position: number;
	/** Signed perpendicular distance, positive toward the left of the direction of travel. */
	offset: number;
};

/**
 * Inverse of `calcConnectorLabelAnchor`: projects a free point onto a polyline
 * (resolved connector path) and expresses it as a `{ position, offset }` pair.
 *
 * The nearest segment wins; ties at a corner go to the earlier segment. Because
 * the projection parameter is clamped per segment, `position` always lands in
 * [0, 1] and a point beyond an end maps to that end.
 *
 * `calcProjectedPointOnLine` is not reused here: it neither clamps to the
 * segment nor exposes the parameter needed for the arc-length position.
 *
 * @param points Resolved coordinate list in source → ...waypoints → target
 *   order. Fewer than 2 points, or a total length of 0, returns null
 * @param point World-coordinate point to project (typically the pointer)
 * @returns The placement, unrounded and unpruned, or null for a degenerate path
 */
export const calcConnectorLabelPlacement = (
	points: readonly Point[],
	point: Point,
): ConnectorLabelPlacement | null => {
	if (points.length < 2) {
		return null;
	}

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

	if (totalLength === 0) {
		return null;
	}

	let nearestDistanceSquared = Infinity;
	let placement: ConnectorLabelPlacement | null = null;
	let traveledLength = 0;

	for (let i = 0; i < segmentLengths.length; i++) {
		const segmentLength = segmentLengths[i];
		// A zero-length segment has no direction to project onto and adds no arc length.
		if (segmentLength === 0) {
			continue;
		}

		const start = points[i];
		const end = points[i + 1];
		const dirX = (end.x - start.x) / segmentLength;
		const dirY = (end.y - start.y) / segmentLength;

		const alongLength = Math.min(
			segmentLength,
			Math.max(0, (point.x - start.x) * dirX + (point.y - start.y) * dirY),
		);
		const projectedX = start.x + dirX * alongLength;
		const projectedY = start.y + dirY * alongLength;

		const gapX = point.x - projectedX;
		const gapY = point.y - projectedY;
		const distanceSquared = gapX * gapX + gapY * gapY;
		if (distanceSquared < nearestDistanceSquared) {
			nearestDistanceSquared = distanceSquared;
			placement = {
				position: (traveledLength + alongLength) / totalLength,
				// Signed length along the left-facing normal (-dy, dx), matching calcConnectorLabelAnchor.
				offset: gapX * -dirY + gapY * dirX,
			};
		}

		traveledLength += segmentLength;
	}

	return placement;
};
