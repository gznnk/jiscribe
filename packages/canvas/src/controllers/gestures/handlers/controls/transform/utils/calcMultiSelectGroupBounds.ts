import { calcOrientedFrameFromPoints } from "@workspace/geometry";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import { calcObjectsBoundingBox } from "../../../../../utils/calcObjectBoundingBox";
import { collectObjectPoints } from "../../../../../utils/collectObjectPoints";

/**
 * Computes the bounding box of the multiSelectGroup (accounting for rotation).
 * When existingGroup is given, computes an Oriented Bounding Box that accounts for its rotation/scale.
 */
export function calcMultiSelectGroupBounds(
	selectedIds: string[],
	allObjects: Record<string, ObjectState>,
	existingGroup?: GroupState | null,
): { cx: number; cy: number; width: number; height: number } | null {
	if (selectedIds.length <= 1) {
		return null;
	}

	// When existingGroup is given, compute an OBB that accounts for its rotation/scale
	if (existingGroup) {
		// Collect all points of the selected objects (recursively expanding groups)
		const allPoints = selectedIds.flatMap((selectedId) => {
			const obj = allObjects[selectedId];
			return obj ? collectObjectPoints(obj, allObjects) : [];
		});
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

		return {
			cx: obb.cx,
			cy: obb.cy,
			width: obb.width,
			height: obb.height,
		};
	}

	// When there is no existingGroup, compute an axis-aligned bounding box
	const bounds = calcObjectsBoundingBox(selectedIds, allObjects);
	if (!bounds) {
		return null;
	}

	return {
		cx: (bounds.left + bounds.right) / 2,
		cy: (bounds.top + bounds.bottom) / 2,
		width: bounds.right - bounds.left,
		height: bounds.bottom - bounds.top,
	};
}
