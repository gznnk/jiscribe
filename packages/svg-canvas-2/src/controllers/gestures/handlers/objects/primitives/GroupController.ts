import type { Point } from "@workspace/geometry";

import { objectRegistry } from "../../../../../registry/ObjectRegistry";
import type { MoveByDeltaFunction } from "../../../../../registry/ObjectRegistryTypes";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";

/**
 * Moves a Group object by a delta.
 * Groups have geometry: "none" and no position (cx, cy), so this returns the state unchanged.
 * When dragging a group, only its descendants are moved (handled by updateDescendantsRecursively).
 */
export const moveByDelta: MoveByDeltaFunction<GroupState> = (state, _delta) => {
	return state;
};

/**
 * Moves a group and all its descendants (including nested groups) by delta.
 * Updates both the group's cached frame and all child objects recursively.
 *
 * @param groupId - ID of the group to move
 * @param originalObjects - Original objects from eventStartState
 * @param updatedObjects - Target objects to write updates to (mutated)
 * @param delta - Movement delta {x, y}
 */
export function moveGroup(
	groupId: string,
	originalObjects: Record<string, ObjectState>,
	updatedObjects: Record<string, ObjectState>,
	delta: Point,
): void {
	const group = originalObjects[groupId];
	if (!group || group.type !== "group") {
		return;
	}

	const groupState = group as GroupState;

	// Move group's cached frame (simple translation)
	updatedObjects[groupId] = {
		...groupState,
		cx: groupState.cx + delta.x,
		cy: groupState.cy + delta.y,
	} as GroupState;

	// Move all children recursively
	for (const childId of groupState.childIds) {
		const child = originalObjects[childId];
		if (!child) continue;

		if (child.type === "group") {
			// Recursively move nested group
			moveGroup(childId, originalObjects, updatedObjects, delta);
		} else {
			// Move regular object using type-specific moveByDelta
			const moveByDeltaFn = objectRegistry.getMoveByDelta(child.type);
			if (moveByDeltaFn) {
				updatedObjects[childId] = moveByDeltaFn(child, delta);
			}
		}
	}
}
