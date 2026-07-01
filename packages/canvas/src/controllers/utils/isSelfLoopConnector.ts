import type { EndpointRef } from "../../schemas/objects/types/EndpointRef";

/**
 * Determines whether a connector is a self-loop (both endpoints connect to the same object).
 *
 * A self-loop can only be drawn cleanly with an orthogonal route, so routing is treated as
 * orthogonal-only (RoutingMenu does not offer straight / SetRoutingStraightCommand is disabled).
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
