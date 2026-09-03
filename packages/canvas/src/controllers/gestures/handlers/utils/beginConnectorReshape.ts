import { isConnectorState } from "../../../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";

/**
 * Opens a drag that reshapes a connector's route, shared by ConnectorSegmentSlideHandler and
 * ConnectorSegmentMoveHandler.
 *
 * Reshaping selects the connector, the same way grabbing its label does — otherwise the route
 * changes under the pointer with nothing to show which connector was touched. Selecting it first is
 * not required: the drag does it on the way in.
 *
 * @param state - State at dragStart
 * @param connectorId - The connector being reshaped; a missing or non-connector id selects nothing
 * @returns The state to start the drag from, with any pending text edit committed
 */
export const beginConnectorReshape = (
	state: CanvasControllerState,
	connectorId: string,
): CanvasControllerState => {
	const nextState = commitTextEditIfNeeded(state);
	if (!isConnectorState(nextState.objects[connectorId])) {
		return nextState;
	}
	return {
		...nextState,
		selectedConnectorId: connectorId,
		selectedIds: [],
		// Without clearing it, an invisible vertex selection lingers and the Delete key deletes an unintended vertex
		selectedVertex: null,
		multiSelectGroup: null,
		// Close the submenu / category flyout on selection change
		objectMenuOpenId: null,
		stencilLibraryOpenCategory: null,
		contextMenuPosition: null,
		edgeScrollEnabled: true,
	};
};
