import type { CanvasControllerState } from "../../../../CanvasTypes";

/**
 * Whether the sidebar shows its Canvas section — the document's own settings.
 *
 * The section stands in for the object sections rather than sitting beside them:
 * it is what the panel holds exactly while there is nothing selected, so the two
 * channels a selection can occupy are both read. A selected text slot rides on a
 * selected object, so it counts as a selection here.
 *
 * @param state - The selection channels are read: `selectedIds` (objects) and `selectedConnectorId`
 * @returns True while nothing at all is selected
 */
export const isCanvasSectionShown = (
	state: Pick<CanvasControllerState, "selectedIds" | "selectedConnectorId">,
): boolean =>
	state.selectedIds.length === 0 && state.selectedConnectorId === null;
