import type { CanvasControllerState } from "../CanvasTypes";

/**
 * The one object the sidebar's Meta section names: the single selected object,
 * a connector included.
 *
 * A note belongs to one object, so a multi-selection names none — and a selected
 * group names the group itself rather than its descendants, which carry notes of
 * their own.
 *
 * @param state - Only `selectedIds` is read; a selected connector is the sole selection like any other object
 * @returns The object's id, or null while nothing or several things are selected
 */
export const resolveMetaTargetId = (
	state: Pick<CanvasControllerState, "selectedIds">,
): string | null =>
	state.selectedIds.length === 1 ? state.selectedIds[0] : null;
