import type { CanvasControllerState } from "../CanvasTypes";

/**
 * The one object the sidebar's Meta section names: the single selected object,
 * or the selected connector.
 *
 * A note belongs to one object, so a multi-selection names none — and a selected
 * group names the group itself rather than its descendants, which carry notes of
 * their own.
 *
 * @param state - The two selection channels are read: `selectedConnectorId` first, since the channels are mutually exclusive, then `selectedIds`
 * @returns The object's id, or null while nothing or several things are selected
 */
export const resolveMetaTargetId = (
	state: Pick<CanvasControllerState, "selectedIds" | "selectedConnectorId">,
): string | null => {
	if (state.selectedConnectorId !== null) {
		return state.selectedConnectorId;
	}
	if (state.selectedIds.length !== 1) {
		return null;
	}
	return state.selectedIds[0];
};
