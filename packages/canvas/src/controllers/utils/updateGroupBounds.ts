import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { GroupState } from "../../states/objects/primitives/group/GroupState";
import { calculateGroupOrientedBounds } from "../../states/utils/calculateGroupOrientedBounds";

/**
 * Updates the bounding frame (cx, cy, width, height) of a group based on its children.
 *
 * @param objects - Current objects map
 * @param groupId - ID of the group to update
 * @returns Updated group state with recalculated bounds, or undefined if group not found
 */
export function updateGroupBounds(
	objects: Record<string, ObjectState>,
	groupId: string,
): GroupState | undefined {
	const group = objects[groupId];
	if (!group || group.type !== "group") {
		return undefined;
	}

	const bounds = calculateGroupOrientedBounds(objects, groupId);

	// bounds is null only when the group has no geometry-bearing children
	// (e.g. it was emptied and is awaiting cleanupGroups). Keep the previous
	// frame in that case: resetting to a zero-size frame at the origin would
	// break the GroupState invariant (width/height > 0) and flash a bogus frame.
	if (!bounds) {
		return group as GroupState;
	}

	return {
		...group,
		cx: bounds.cx,
		cy: bounds.cy,
		width: bounds.width,
		height: bounds.height,
	} as GroupState;
}
