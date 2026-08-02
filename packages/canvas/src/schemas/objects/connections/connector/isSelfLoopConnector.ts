import type { EndpointRef } from "../../types/EndpointRef";

/**
 * Determines whether a connector is a self-loop (both endpoints connect to the same object).
 *
 * A self-loop the engine routes has nowhere to draw a straight line to, so it is always drawn at
 * right angles, and the UI does not offer the choice (RoutingMenu hides straight /
 * SetRoutingStraightCommand is disabled). Vertices do lift the degeneracy — a self-loop with any is
 * drawn through them either way (see resolveConnectorPoints) — but there is no way to add one
 * before the shape is chosen, so the menu stays hidden.
 *
 * Hiding the menu does not mean the field cannot say "straight": an explicitly set routing survives
 * a re-anchor (see ConnectionAnchorEventHandler), so a connector made straight between two shapes
 * still carries it after one end is dragged onto the other's shape. Anything reasoning about the
 * drawn line must therefore ask isConnectorDrawnOrthogonal rather than the field.
 *
 * @param connector - Connector holding source / target endpoint references
 * @returns true if both ends have an owner.id and they are equal
 */
export const isSelfLoopConnector = (connector: {
	source: EndpointRef;
	target: EndpointRef;
}): boolean => {
	const sourceOwnerId = connector.source.owner?.id;
	const targetOwnerId = connector.target.owner?.id;
	return sourceOwnerId != null && sourceOwnerId === targetOwnerId;
};
