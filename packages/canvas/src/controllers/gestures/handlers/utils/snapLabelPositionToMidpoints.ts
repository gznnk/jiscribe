import { calcEuclideanDistance, type Point } from "@jiscribe/geometry";

import type { ConnectorLabelPlacement } from "../../../../rendering/objects/connector/geometry/label/calcConnectorLabelPlacement";

/**
 * Pulls a label's `position` onto the nearest midpoint along its path — the
 * middle of the whole path, or of one of its segments — so a label lands
 * centered on the line or on one leg of it without pixel-perfect aiming.
 * `offset` is left as it is, so a label beside the line lines up beside the
 * midpoint too.
 *
 * Distances are measured along the path (the ratio difference times the path
 * length), not across the plane. Of several midpoints inside the threshold the
 * nearest wins, and on a tie the one nearer the source.
 *
 * @param placement - Raw placement from calcConnectorLabelPlacement, `position`
 *   as a ratio over the path length
 * @param points - The resolved path `placement` was measured against, in
 *   source → ...waypoints → target order; a zero-length segment adds no
 *   midpoint of its own
 * @param thresholdSvg - Snap threshold in SVG units (SNAP_THRESHOLD_PX / zoom
 *   for a drag); a midpoint exactly at the threshold is left alone, as in findSnap
 * @returns The placement with `position` replaced by the midpoint's ratio, or
 *   `placement` itself when no midpoint is inside the threshold or the path has
 *   no length (fewer than 2 points included)
 */
export const snapLabelPositionToMidpoints = (
	placement: ConnectorLabelPlacement,
	points: readonly Point[],
	thresholdSvg: number,
): ConnectorLabelPlacement => {
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
		return placement;
	}

	const midpointPositions = [0.5];
	let traveledLength = 0;
	for (const segmentLength of segmentLengths) {
		if (segmentLength > 0) {
			midpointPositions.push(
				(traveledLength + segmentLength / 2) / totalLength,
			);
		}
		traveledLength += segmentLength;
	}

	let nearestPosition: number | null = null;
	let nearestDistance = thresholdSvg;
	for (const midpointPosition of midpointPositions) {
		const distance =
			Math.abs(midpointPosition - placement.position) * totalLength;
		if (
			distance < nearestDistance ||
			(distance === nearestDistance &&
				nearestPosition !== null &&
				midpointPosition < nearestPosition)
		) {
			nearestDistance = distance;
			nearestPosition = midpointPosition;
		}
	}

	return nearestPosition === null
		? placement
		: { ...placement, position: nearestPosition };
};
