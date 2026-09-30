import { isPoly } from "@jiscribe/doc/model/objects/types/Poly";
import { calcKeyPointsBoundingBox } from "@jiscribe/geometry";
import type { FrameKeyPoints } from "@jiscribe/geometry";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { SnapCandidate, SnapCandidates } from "../../../../CanvasTypes";

/**
 * Generates snap candidates from every non-group object that has keyPoints.
 * Frames contribute their bbox edges and center; polylines and polygons contribute
 * each vertex (edge "vertex") and their bbox center, since their bbox edges are not
 * lines anything can be drawn against.
 * Call it at dragStart with the keyPoints already computed for that frame.
 * Exclusions (selected / descendants) must be applied by the caller as filteredCandidates.
 *
 * @param objects - Object map
 * @param keyPointsById - Object ID → keyPoints, the same map the DragStartSnapshot
 *   holds; an object missing from it contributes no candidate
 */
export const calcSnapCandidates = (
	objects: Record<string, ObjectState>,
	keyPointsById: Record<string, FrameKeyPoints>,
): SnapCandidates => {
	const xCandidates: SnapCandidate[] = [];
	const yCandidates: SnapCandidate[] = [];

	for (const [id, obj] of Object.entries(objects)) {
		if (obj.type === "group") {
			continue;
		}
		const keyPoints = keyPointsById[id];
		if (!keyPoints) {
			continue;
		}

		const bbox = calcKeyPointsBoundingBox(keyPoints);

		const { left, right, top, bottom } = bbox;
		const centerX = (left + right) / 2;
		const centerY = (top + bottom) / 2;

		if (isPoly(obj) && obj.type !== "connector") {
			for (const point of obj.points) {
				xCandidates.push({
					objectId: id,
					coordinate: point.x,
					edge: "vertex",
					perpendicularMin: point.y,
					perpendicularMax: point.y,
				});
				yCandidates.push({
					objectId: id,
					coordinate: point.y,
					edge: "vertex",
					perpendicularMin: point.x,
					perpendicularMax: point.x,
				});
			}
			xCandidates.push({
				objectId: id,
				coordinate: centerX,
				edge: "hCenter",
				perpendicularMin: top,
				perpendicularMax: bottom,
			});
			yCandidates.push({
				objectId: id,
				coordinate: centerY,
				edge: "vCenter",
				perpendicularMin: left,
				perpendicularMax: right,
			});
			continue;
		}

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
