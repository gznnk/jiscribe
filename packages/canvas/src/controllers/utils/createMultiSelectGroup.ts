import {
	calcBoundingBox,
	calcPolyBoundingBox,
	isTransformedFrame,
} from "@workspace/geometry";

import { MULTI_SELECT_GROUP } from "../../constants/multiSelectGroup";
import { isPoly } from "../../schemas/objects/types/Poly";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { GroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * Build a transient multi-select group state that wraps the current selection.
 *
 * Computes the group's bounding box by recursively traversing the selected objects (and any
 * nested groups) and returns an axis-aligned group (rotation 0, no flip) centered on it.
 * Returns null when one or fewer objects are selected, or when no valid bounds are found.
 *
 * @param selectedIds - IDs of the currently selected objects
 * @param allObjects - All objects, used to resolve children and geometry
 * @param existingMultiSelectGroup - Prior multi-select group, whose lockAspectRatio is preserved
 */
export function createMultiSelectGroup(
	selectedIds: string[],
	allObjects: Record<string, ObjectState>,
	existingMultiSelectGroup?: GroupState | null,
): GroupState | null {
	if (selectedIds.length <= 1) {
		return null; // Do not group when one or fewer objects are selected
	}

	// Compute the bounding box recursively
	const bounds = {
		minX: Infinity,
		maxX: -Infinity,
		minY: Infinity,
		maxY: -Infinity,
	};
	collectBounds(allObjects, selectedIds, bounds);

	// No valid points were found
	if (!isFinite(bounds.minX)) {
		return null;
	}

	// Compute center, width, and height from the bounding box
	const cx = (bounds.minX + bounds.maxX) / 2;
	const cy = (bounds.minY + bounds.maxY) / 2;
	const width = bounds.maxX - bounds.minX;
	const height = bounds.maxY - bounds.minY;

	// Preserve the existing lockAspectRatio, defaulting to true
	const lockAspectRatio = existingMultiSelectGroup?.lockAspectRatio ?? true;

	// Return the GroupState (rotation 0, no flip)
	// keyPoints is managed via EventStartSnapshot.keyPoints, so it is not set here
	return {
		type: "group",
		id: MULTI_SELECT_GROUP.ID,
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		childIds: selectedIds,
		lockAspectRatio,
	} as unknown as GroupState;
}

/**
 * Recursively traverse children and update the bounding box.
 */
function collectBounds(
	objects: Record<string, ObjectState>,
	childIds: string[],
	bounds: { minX: number; maxX: number; minY: number; maxY: number },
): void {
	for (const childId of childIds) {
		const child = objects[childId];
		if (!child) {
			continue;
		}

		if (child.type === "group") {
			// For a group, process its children recursively
			const nestedGroup = child as GroupState;
			collectBounds(objects, nestedGroup.childIds, bounds);
		} else if (isTransformedFrame(child)) {
			// Get the TransformedFrame's bounding box and expand the range
			const box = calcBoundingBox(child);
			bounds.minX = Math.min(bounds.minX, box.left);
			bounds.maxX = Math.max(bounds.maxX, box.right);
			bounds.minY = Math.min(bounds.minY, box.top);
			bounds.maxY = Math.max(bounds.maxY, box.bottom);
		} else if (isPoly(child)) {
			// For Poly-based shapes (Polyline, Polygon), compute the bounding box directly from the points array
			const bbox = calcPolyBoundingBox(child.points);
			if (bbox) {
				bounds.minX = Math.min(bounds.minX, bbox.left);
				bounds.maxX = Math.max(bounds.maxX, bbox.right);
				bounds.minY = Math.min(bounds.minY, bbox.top);
				bounds.maxY = Math.max(bounds.maxY, bbox.bottom);
			}
		}
	}
}
