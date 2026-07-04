import { calcObjectsBoundingBox } from "./calcObjectBoundingBox";
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
 */
export function createMultiSelectGroup(
	selectedIds: string[],
	allObjects: Record<string, ObjectState>,
	existingMultiSelectGroup?: GroupState | null,
): GroupState | null {
	if (selectedIds.length <= 1) {
		return null; // Do not group when one or fewer objects are selected
	}

	const bounds = calcObjectsBoundingBox(selectedIds, allObjects);

	// No valid points were found
	if (!bounds) {
		return null;
	}

	// Compute center, width, and height from the bounding box
	const cx = (bounds.left + bounds.right) / 2;
	const cy = (bounds.top + bounds.bottom) / 2;
	const width = bounds.right - bounds.left;
	const height = bounds.bottom - bounds.top;

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
