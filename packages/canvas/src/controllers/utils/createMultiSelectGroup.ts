import type { BoundingBox } from "@jiscribe/geometry";

import { calcUnionBoundingBox } from "./buildObjectBBoxes";
import { calcObjectsBoundingBox } from "./calcObjectBoundingBox";
import { MIN_GROUP_DIMENSION } from "../../constants/groupDimensions";
import { MULTI_SELECT_GROUP } from "../../constants/multiSelectGroup";
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
 * @param precomputedBBoxes - Optional "id → root-level bbox" map (from EventStartSnapshot).
 *   When supplied, bounds are the union of the selected ids' precomputed bboxes instead of a
 *   fresh recursive traversal — used by the marquee hot path. selectedIds there are always
 *   top-level shapes/groups present in the map, so the union is identical to the traversal.
 */
export function createMultiSelectGroup(
	selectedIds: string[],
	allObjects: Record<string, ObjectState>,
	existingMultiSelectGroup?: GroupState | null,
	precomputedBBoxes?: Record<string, BoundingBox>,
): GroupState | null {
	if (selectedIds.length <= 1) {
		return null; // Do not group when one or fewer objects are selected
	}

	const bounds = precomputedBBoxes
		? calcUnionBoundingBox(selectedIds, precomputedBBoxes)
		: calcObjectsBoundingBox(selectedIds, allObjects);

	// No valid points were found
	if (!bounds) {
		return null;
	}

	// Compute center, width, and height from the bounding box.
	// GroupState invariant: clamp width/height to the minimum so a collinear
	// selection (e.g. two horizontal lines on the same y) never yields a
	// zero-size group — the group's size is a divisor when scaling the
	// selection (transformFrameByGroup).
	const cx = (bounds.left + bounds.right) / 2;
	const cy = (bounds.top + bounds.bottom) / 2;
	const width = Math.max(bounds.right - bounds.left, MIN_GROUP_DIMENSION);
	const height = Math.max(bounds.bottom - bounds.top, MIN_GROUP_DIMENSION);

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
