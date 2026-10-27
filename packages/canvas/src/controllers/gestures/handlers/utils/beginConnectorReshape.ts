import { isConnectorState } from "../../../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { claimDrag } from "../../../utils/claimDrag";
import { closeStencilPopups } from "../../../utils/closeStencilPopups";

/**
 * Opens a drag that reshapes a connector's route, shared by ConnectorSegmentSlideHandler and
 * ConnectorSegmentMoveHandler.
 *
 * Reshaping selects the connector, the same way grabbing its label does — otherwise the route
 * changes under the pointer with nothing to show which connector was touched. Selecting it first is
 * not required: the drag does it on the way in.
 *
 * @param state - State at dragStart, any open text edit already committed by
 *   ConnectorEventHandler before routing
 * @param connectorId - The connector being reshaped; a missing or non-connector id selects nothing
 * @returns The state to start the drag from, its drag a `"segment"` one
 */
export const beginConnectorReshape = (
	state: CanvasControllerState,
	connectorId: string,
): CanvasControllerState => {
	if (!isConnectorState(state.objects[connectorId])) {
		return state;
	}
	return claimDrag(
		{
			...state,
			// Reshaping renumbers the connector's waypoints, so a picked one is dropped
			// rather than left addressing whoever took the number over.
			selection: { objectIds: [connectorId], part: null },
			multiSelectGroup: null,
			// Close the submenu / category flyout on selection change
			objectMenuOpenId: null,
			...closeStencilPopups(),
			contextMenuPosition: null,
		},
		{ kind: "segment" },
		{ edgeScroll: true },
	);
};
