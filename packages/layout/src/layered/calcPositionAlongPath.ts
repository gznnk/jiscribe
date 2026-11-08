import {
	calcDistanceToSegment,
	calcEuclideanDistance,
	type Point,
} from "@jiscribe/geometry";

/**
 * Where on a polyline a point lands, as the fraction of the path's length before the
 * point's nearest spot on it.
 *
 * @param path - At least two points; a path of zero length answers 0
 * @param point - Any point; one off the path is projected onto its nearest segment,
 *   clamped to that segment's ends
 * @returns 0 at the path's start, 1 at its end
 */
export const calcPositionAlongPath = (
	path: readonly Point[],
	point: Point,
): number => {
	const segmentLengths = path
		.slice(1)
		.map((end, index) =>
			calcEuclideanDistance(path[index].x, path[index].y, end.x, end.y),
		);
	const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
	if (totalLength === 0) {
		return 0;
	}
	let nearestIndex = 0;
	let nearestDistance = Number.POSITIVE_INFINITY;
	segmentLengths.forEach((_, index) => {
		const distance = calcDistanceToSegment(point, path[index], path[index + 1]);
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearestIndex = index;
		}
	});
	const start = path[nearestIndex];
	const end = path[nearestIndex + 1];
	const segmentLength = segmentLengths[nearestIndex];
	// The projection's parameter along the segment, clamped to the segment itself.
	const parameter =
		segmentLength === 0
			? 0
			: Math.min(
					1,
					Math.max(
						0,
						((point.x - start.x) * (end.x - start.x) +
							(point.y - start.y) * (end.y - start.y)) /
							segmentLength ** 2,
					),
				);
	const lengthBefore = segmentLengths
		.slice(0, nearestIndex)
		.reduce((sum, length) => sum + length, 0);
	return (lengthBefore + parameter * segmentLength) / totalLength;
};
