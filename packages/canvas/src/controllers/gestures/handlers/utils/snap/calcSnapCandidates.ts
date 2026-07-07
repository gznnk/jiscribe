import { calcKeyPointsBoundingBox } from "@workspace/geometry";
import type { FrameKeyPoints } from "@workspace/geometry";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { SnapCandidate, SnapCandidates } from "../../../../CanvasTypes";

/**
 * Generates snap candidates from all Frame objects.
 * Call it at dragStart with a precomputed keyPointsCache.
 * Exclusions (selected / descendants) must be applied by the caller as filteredCandidates.
 *
 * @param objects - Object map
 * @param keyPointsCache - Precomputed keyPoints cache (passed from EventStartSnapshot)
 */
export const calcSnapCandidates = (
	objects: Record<string, ObjectState>,
	keyPointsCache: Record<string, FrameKeyPoints>,
): SnapCandidates => {
	const xCandidates: SnapCandidate[] = [];
	const yCandidates: SnapCandidate[] = [];

	for (const [id, obj] of Object.entries(objects)) {
		if (obj.type === "group") {
			continue;
		}
		const keyPoints = keyPointsCache[id];
		if (!keyPoints) {
			continue;
		}

		const bbox = calcKeyPointsBoundingBox(keyPoints);

		const { left, right, top, bottom } = bbox;
		const centerX = (left + right) / 2;
		const centerY = (top + bottom) / 2;

		// x candidates: left / right edges + hCenter (center X coordinate)
		// perpendicularMin/Max is the Y range (used to extend the vertical guide line)
		xCandidates.push(
			{
				objectId: id,
				coordinate: left,
				edge: "left",
				perpendicularMin: top,
				perpendicularMax: bottom,
			},
			{
				objectId: id,
				coordinate: right,
				edge: "right",
				perpendicularMin: top,
				perpendicularMax: bottom,
			},
			{
				objectId: id,
				coordinate: centerX,
				edge: "hCenter",
				perpendicularMin: top,
				perpendicularMax: bottom,
			},
		);

		// y candidates: top / bottom edges + vCenter (center Y coordinate)
		// perpendicularMin/Max is the X range (used to extend the horizontal guide line)
		yCandidates.push(
			{
				objectId: id,
				coordinate: top,
				edge: "top",
				perpendicularMin: left,
				perpendicularMax: right,
			},
			{
				objectId: id,
				coordinate: bottom,
				edge: "bottom",
				perpendicularMin: left,
				perpendicularMax: right,
			},
			{
				objectId: id,
				coordinate: centerY,
				edge: "vCenter",
				perpendicularMin: left,
				perpendicularMax: right,
			},
		);
	}

	xCandidates.sort((a, b) => a.coordinate - b.coordinate);
	yCandidates.sort((a, b) => a.coordinate - b.coordinate);

	return { x: xCandidates, y: yCandidates };
};
