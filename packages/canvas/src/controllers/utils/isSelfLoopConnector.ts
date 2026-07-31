import type { EndpointRef } from "../../schemas/objects/types/EndpointRef";

/**
 * Determines whether a connector is a self-loop (both endpoints connect to the same object).
 *
 * A self-loop the engine routes has nowhere to draw a straight line to, so the UI keeps it on right
 * angles (RoutingMenu does not offer straight / SetRoutingStraightCommand is disabled). Vertices do
 * lift the degeneracy — a self-loop with any is drawn through them either way (resolveConnectorPoints
 * 参照) — but there is no way to add one before the shape is chosen, so the menu stays hidden.
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
