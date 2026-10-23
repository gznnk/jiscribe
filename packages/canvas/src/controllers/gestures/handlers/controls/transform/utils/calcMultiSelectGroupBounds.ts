import {
	calcOrientedFrameFromPoints,
	calcPolyBoundingBox,
} from "@jiscribe/geometry";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import { MIN_GROUP_DIMENSION } from "../../../../../../states/utils/groupDimensions";
import { collectObjectsPoints } from "../../../../../utils/collectObjectPoints";
import type { ConnectorRouteRegistries } from "../../../../../utils/VisualExtentRegistries";

/**
 * Computes the bounding box of the multiSelectGroup (accounting for rotation).
 * When existingGroup is given, computes an Oriented Bounding Box that accounts for its rotation/scale.
 * Both paths read the points createMultiSelectGroup builds the frame from
 * (collectObjectPoints), so connectors count along their drawn route and without their labels.
 *
 * @param registries - Per-canvas registries a selected connector's path is resolved through
 */
export function calcMultiSelectGroupBounds(
	selectedIds: readonly string[],
	allObjects: Record<string, ObjectState>,
	registries: ConnectorRouteRegistries,
	existingGroup?: GroupState | null,
): { cx: number; cy: number; width: number; height: number } | null {
	if (selectedIds.length <= 1) {
		return null;
	}

	// Collect all points of the selected objects (recursively expanding groups)
	const allPoints = collectObjectsPoints(selectedIds, allObjects, registries);

	// When existingGroup is given, compute an OBB that accounts for its rotation/scale
	if (existingGroup) {
		if (allPoints.length === 0) {
			return null;
		}

		// Get the group's transform
		const groupRotation = existingGroup.rotation ?? 0;
		const groupScaleX = existingGroup.scaleX ?? 1;
		const groupScaleY = existingGroup.scaleY ?? 1;

		// Compute an Oriented Bounding Box with the group's transform from the point set
		const obb = calcOrientedFrameFromPoints(
			allPoints,
			groupScaleX,
			groupScaleY,
			groupRotation,
		);

		if (!obb) {
			return null;
		}

		// GroupState invariant: a degenerate axis (collinear selection) must not
		// produce a zero-size group — its size is a divisor in transformFrameByGroup
		return {
			cx: obb.cx,
			cy: obb.cy,
			width: Math.max(obb.width, MIN_GROUP_DIMENSION),
			height: Math.max(obb.height, MIN_GROUP_DIMENSION),
		};
	}

	// When there is no existingGroup, compute an axis-aligned bounding box
	const bounds = calcPolyBoundingBox(allPoints);
	if (!bounds) {
		return null;
	}

	return {
		cx: (bounds.left + bounds.right) / 2,
		cy: (bounds.top + bounds.bottom) / 2,
		width: Math.max(bounds.right - bounds.left, MIN_GROUP_DIMENSION),
		height: Math.max(bounds.bottom - bounds.top, MIN_GROUP_DIMENSION),
	};
}
