import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { getSelectedConnectorId } from "../../utils/getSelectedConnectorId";
import { hasSelectedConnectorShapedRoute } from "../../utils/hasSelectedConnectorShapedRoute";
import type { ExecutableCommand } from "../CommandTypes";

/** The selected connector, when a single one is selected and its route is hand-shaped. */
const selectedShapedConnector = (
	state: CanvasControllerState,
): ConnectorState | null => {
	const id = getSelectedConnectorId(state);
	if (id === null || !hasSelectedConnectorShapedRoute(state)) {
		return null;
	}
	return state.objects[id] as ConnectorState;
};

/**
 * Drops a connector's vertices, handing its route back to the engine.
 *
 * This is the way out of a route that has been shaped into a corner: the vertices are the whole path
 * once there are any, so a badly placed one can only be undone by moving it back or by clearing the
 * lot. It is deliberately the only thing that discards them — switching the line shape does not.
 */
const resetConnectorRoute = (
	state: CanvasControllerState,
): CanvasControllerState => {
	const connector = selectedShapedConnector(state);
	if (!connector) {
		return state;
	}

	const resetConnector: ConnectorState = { ...connector, points: [] };
	return {
		...state,
		objects: {
			...state.objects,
			[connector.id]: resetConnector,
		},
		// The waypoints are gone, so a picked one addresses nothing.
		selection: { ...state.selection, part: null },
		commitVersion: state.commitVersion + 1,
	};
};

export const ResetConnectorRouteCommand: ExecutableCommand = {
	id: "resetConnectorRoute",
	label: { en: "Reset Route", ja: "経路を自動に戻す" },
	category: "edit",
	canExecute: hasSelectedConnectorShapedRoute,
	execute: resetConnectorRoute,
};
