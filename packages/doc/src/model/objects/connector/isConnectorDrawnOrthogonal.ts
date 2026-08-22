import { isSelfLoopConnector } from "./isSelfLoopConnector";
import { isOrthogonalRouting } from "../types/ConnectorRouting";
import type { ConnectorRouting } from "../types/ConnectorRouting";
import type { EndpointRef } from "../types/EndpointRef";

/**
 * Whether the connector's line is drawn at right angles — which is not the same question as what
 * `routing` says.
 *
 * A self-loop has nowhere to run a straight line to, so it is drawn as a rectangular loop whatever
 * the routing field holds (see resolveConnectorPoints / routeSelfLoop). `routing` survives a
 * re-anchor once it has been set explicitly, so a connector can genuinely carry "straight" while
 * being drawn orthogonally, and the two answers part ways.
 *
 * Everything that reasons about the drawn line rather than the stored field asks this instead of
 * `isOrthogonalRouting`: which hit bands the segments get, which handles the selection shows, and
 * the route resolution itself. Deriving it once is what keeps them from drifting apart — a band
 * offered for a shape the line is not drawn in answers to nothing (#229).
 *
 * @param connector - Endpoint references and the routing field; the shapes they own are not needed
 * @returns True for right angles: orthogonal routing (the default when `routing` is omitted) or a
 *   self-loop
 */
export const isConnectorDrawnOrthogonal = (connector: {
	source: EndpointRef;
	target: EndpointRef;
	routing?: ConnectorRouting;
}): boolean =>
	isOrthogonalRouting(connector.routing) || isSelfLoopConnector(connector);
