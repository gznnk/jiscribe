import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { calculateGroupOrientedBounds } from "../../../states/utils/calculateGroupOrientedBounds";

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

	return {
		...group,
		cx: bounds?.cx ?? 0,
		cy: bounds?.cy ?? 0,
		width: bounds?.width ?? 0,
		height: bounds?.height ?? 0,
	} as GroupState;
}
