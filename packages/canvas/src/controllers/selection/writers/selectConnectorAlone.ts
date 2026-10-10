import type { CanvasControllerState } from "../../CanvasTypes";

/**
 * Selects a connector, dropping whatever else was selected: a connector is the
 * whole selection or nothing (see CanvasControllerState.selection.objectIds). Shared by
 * the left-button click (ConnectorClickHandler) and by the right button / long
 * press that opens the context menu (CanvasEventHandler).
 *
 * @param canvasState - Current canvas controller state
 * @param connectorId - The connector to select; an id absent from
 *   canvasState.objects still becomes the selection, as the click path has
 *   always allowed
 * @returns The state with the connector selected, or canvasState itself when it
 *   is already the whole selection
 */
export function selectConnectorAlone(
	canvasState: CanvasControllerState,
	connectorId: string,
): CanvasControllerState {
	const { objectIds } = canvasState.selection;
	if (objectIds.length === 1 && objectIds[0] === connectorId) {
		return canvasState;
	}

	return {
		...canvasState,
		// A picked part goes with the object it hung off: the connector replaces it.
		selection: { objectIds: [connectorId], part: null },
		multiSelectGroup: null,
		// Close the submenu / category flyout on selection change
		objectMenuOpenId: null,
		stencilLibraryOpenCategory: null,
	};
}
