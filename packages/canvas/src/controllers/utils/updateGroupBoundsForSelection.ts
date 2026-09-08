import { updateGroupBoundsFromRoot } from "./updateGroupBoundsFromRoot";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Settles every group frame a transform of the current selection can have
 * invalidated: the selected groups themselves, and the ancestors of anything
 * selected that sits inside one.
 *
 * The whole root subtree is recomputed per selected id rather than the chain
 * above it, since a resized group's own frame is derived from the children the
 * resize just scaled. Shared by the transform drag's `dragEnd` and by the
 * property panel's `TRANSFORM_PROPERTY_UPDATE`, which have to leave the same
 * bounds behind.
 *
 * @param state - The state holding the already-transformed objects; its `selectedIds` name what moved
 * @returns `state` itself when nothing selected is a group or lives in one
 */
export const updateGroupBoundsForSelection = (
	state: CanvasControllerState,
): CanvasControllerState => {
	let nextState = state;
	for (const selectedId of nextState.selectedIds) {
		const object = nextState.objects[selectedId];
		if (object && (object.type === "group" || object.parentId)) {
			nextState = updateGroupBoundsFromRoot(nextState, selectedId);
		}
	}
	return nextState;
};
