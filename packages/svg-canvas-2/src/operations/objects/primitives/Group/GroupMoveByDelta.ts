import type { MoveByDeltaFunction } from "../../../../registry/ObjectRegistryTypes";
import type { GroupState } from "../../../../states/objects/primitives/GroupState";

/**
 * Moves a Group object by a delta.
 * Groups have geometry: "none" and no position (cx, cy), so this returns the state unchanged.
 * When dragging a group, only its descendants are moved (handled by updateDescendantsRecursively).
 */
export const groupMoveByDelta: MoveByDeltaFunction<GroupState> = (state, _delta) => {
	return state;
};
