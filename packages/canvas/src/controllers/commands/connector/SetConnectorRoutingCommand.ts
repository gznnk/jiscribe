import { roundToDecimal } from "@workspace/geometry";
import type { Point } from "@workspace/geometry";

import { PRECISION } from "../../../constants/precision";
import { isOrthogonalRouting } from "../../../schemas/objects/types/ConnectorRouting";
import type { ConnectorRouting } from "../../../schemas/objects/types/ConnectorRouting";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ICanvasRegistries } from "../../registries/ICanvasRegistries";
import { collectConnectorPoints } from "../../utils/calcConnectorBoundingBox";
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
 * The vertices to store when switching a shaped route to straight: the path exactly as drawn on
 * screen. Under orthogonal the vertices next to the endpoints are re-aligned at render time
 * (alignVertexPath), so the stored list can lag behind a shape that has moved since — straight
 * draws the stored list raw, and switching on the stale one would jump to a route the user is not
 * looking at. Null when the path cannot be resolved; the stored vertices are then kept as they are.
 */
const bakeDrawnVertices = (
	connector: ConnectorState,
	state: CanvasControllerState,
	registries: ICanvasRegistries,
): Point[] | null => {
	const path = collectConnectorPoints(
		connector,
		state.objects,
		registries.objectOutline,
		registries.objectAnchorRegion,
	);
	if (!path) {
		return null;
	}
	return path.slice(1, -1).map((point) => ({
		x: roundToDecimal(point.x, PRECISION.COORDINATE),
		y: roundToDecimal(point.y, PRECISION.COORDINATE),
	}));
};

/**
 * Replace the line shape of the selected connector.
 *
 * `points` keeps holding the route's own vertices across the switch (ConnectorDoc 参照); the only
 * write is that switching to straight bakes the drawn path into it (bakeDrawnVertices 参照), so
 * what is on screen is what the per-vertex handles pick up. A connector with no vertices keeps
 * none — straight then draws the single direct line, as before. Switching back to orthogonal
 * writes nothing. Only ResetConnectorRouteCommand discards vertices.
 *
 * Since the per-vertex handles disappear under orthogonal, the selected vertex is cleared.
 *
 * No-op if the effective routing does not change. This avoids creating a wasteful history entry
 * on re-click and avoids polluting the document by writing a redundant `routing: "orthogonal"`
 * onto a connector whose default (routing omitted = orthogonal) already applies.
 */
const applyConnectorRouting = (
	state: CanvasControllerState,
	routing: ConnectorRouting,
	registries: ICanvasRegistries,
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

	const points =
		routing === "straight" && connector.points.length > 0
			? (bakeDrawnVertices(connector, state, registries) ?? connector.points)
			: connector.points;

	const nextConnector: ConnectorState = {
		...connector,
		routing,
		points,
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
	execute: (state, registries) =>
		applyConnectorRouting(state, "straight", registries),
};

export const SetRoutingOrthogonalCommand: ExecutableCommand = {
	id: "setRoutingOrthogonal",
	label: "Orthogonal Routing",
	category: "edit",
	canExecute: isConnectorSelected,
	execute: (state, registries) =>
		applyConnectorRouting(state, "orthogonal", registries),
};
