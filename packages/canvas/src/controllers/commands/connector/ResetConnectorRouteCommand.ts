import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * The selected connector, when a single one is selected and its route is hand-shaped.
 * A connector with no vertices is already the engine's to route, so there is nothing to reset.
 */
const selectedShapedConnector = (
	state: CanvasControllerState,
): ConnectorState | null => {
	const id = state.selectedConnectorId;
	if (id === null) {
		return null;
	}
	const connector = state.objects[id] as ConnectorState | undefined;
	if (!connector || connector.type !== "connector") {
		return null;
	}
	return connector.points.length > 0 ? connector : null;
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
		selectedVertex: null,
		commitVersion: state.commitVersion + 1,
	};
};

export const ResetConnectorRouteCommand: ExecutableCommand = {
	id: "resetConnectorRoute",
	label: "Reset Route",
	category: "edit",
	canExecute: (state) => selectedShapedConnector(state) !== null,
	execute: resetConnectorRoute,
};
