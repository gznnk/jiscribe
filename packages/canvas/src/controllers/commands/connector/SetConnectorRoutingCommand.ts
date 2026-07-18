import { isOrthogonalRouting } from "../../../schemas/objects/types/ConnectorRouting";
import type { ConnectorRouting } from "../../../schemas/objects/types/ConnectorRouting";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { isSelfLoopConnector } from "../../utils/isSelfLoopConnector";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * Executable only when the current selection is a single connector.
 * Routing switching is only meaningful for the connector referenced by selectedConnectorId.
 */
const isConnectorSelected = (state: CanvasControllerState): boolean =>
	state.selectedConnectorId !== null &&
	state.objects[state.selectedConnectorId]?.type === "connector";

/**
 * Switching to straight is possible only when a single connector is selected and it is not a self-loop.
 * A self-loop breaks down as a straight line, so it is treated as orthogonal-only.
 */
const canSetStraight = (state: CanvasControllerState): boolean => {
	if (!isConnectorSelected(state)) {
		return false;
	}
	const connector = state.objects[state.selectedConnectorId as string];
	return (
		connector?.type === "connector" &&
		!isSelfLoopConnector(connector as ConnectorState)
	);
};

/**
 * Replace the routing of the selected connector.
 *
 * `orthogonal` is a derived value whose path is computed at render time, and as a document
 * invariant `points` (manual waypoints) is always kept empty. So when switching to orthogonal,
 * existing waypoints are discarded. When switching to `straight`, existing waypoints are preserved.
 *
 * Since the waypoint move handles disappear, the selected waypoint (selectedVertex) is also cleared.
 *
 * No-op if the effective routing does not change. This avoids creating a wasteful history entry
 * on re-click and avoids polluting the document by writing a redundant `routing: "orthogonal"`
 * onto a connector whose default (routing omitted = orthogonal) already applies.
 */
const applyConnectorRouting = (
	state: CanvasControllerState,
	routing: ConnectorRouting,
): CanvasControllerState => {
	const id = state.selectedConnectorId;
	if (id === null) {
		return state;
	}

	const connector = state.objects[id] as ConnectorState | undefined;
	if (!connector || connector.type !== "connector") {
		return state;
	}

	const isAlreadyApplied =
		isOrthogonalRouting(connector.routing) === (routing === "orthogonal");
	if (isAlreadyApplied) {
		return state;
	}

	const nextConnector: ConnectorState = {
		...connector,
		routing,
		points: routing === "orthogonal" ? [] : connector.points,
	} as ConnectorState;

	return {
		...state,
		objects: {
			...state.objects,
			[id]: nextConnector,
		},
		selectedVertex: null,
		commitVersion: state.commitVersion + 1,
	};
};

export const SetRoutingStraightCommand: ExecutableCommand = {
	id: "setRoutingStraight",
	label: "Straight Routing",
	category: "edit",
	canExecute: canSetStraight,
	execute: (state) => applyConnectorRouting(state, "straight"),
};

export const SetRoutingOrthogonalCommand: ExecutableCommand = {
	id: "setRoutingOrthogonal",
	label: "Orthogonal Routing",
	category: "edit",
	canExecute: isConnectorSelected,
	execute: (state) => applyConnectorRouting(state, "orthogonal"),
};
