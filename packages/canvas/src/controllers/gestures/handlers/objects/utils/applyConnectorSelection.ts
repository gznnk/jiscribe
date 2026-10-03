import type { CanvasControllerState } from "../../../../CanvasTypes";

/**
 * Selects a connector, clearing the shape selection to keep the two mutually
 * exclusive (selectedConnectorId vs selectedIds). Shared by the left-button
 * click (ConnectorClickHandler) and by the right button / long press that opens
 * the context menu (CanvasEventHandler).
 *
 * @param canvasState - Current canvas controller state
 * @param connectorId - The connector to select; an id absent from
 *   canvasState.objects still becomes the selection, as the click path has
 *   always allowed
 * @returns The state with the connector selected, or canvasState itself when it
 *   is already the selected connector
 */
export function applyConnectorSelection(
	canvasState: CanvasControllerState,
	connectorId: string,
): CanvasControllerState {
	if (canvasState.selectedConnectorId === connectorId) {
		return canvasState;
	}

	return {
		...canvasState,
		selectedConnectorId: connectorId,
		selectedIds: [],
		multiSelectGroup: null,
		// Close the submenu / category flyout on selection change
		objectMenuOpenId: null,
		stencilLibraryOpenCategory: null,
	};
}
