import type { TakenEnd } from "@jiscribe/layout";

import type { ConnectorDoc } from "../../model/objects/connector/ConnectorDoc";
import {
	type EndpointRef,
	isConnectPointId,
	toEquivalentEdgeAnchor,
} from "../../model/objects/types/EndpointRef";

export const readOwnerId = (endpoint: EndpointRef): string | undefined =>
	endpoint.owner?.id;

/**
 * Whether an end sits on a connect point the owner's type declares beyond the four
 * edge midpoints (an ER entity's column), which says where on the owner the line
 * belongs and so is kept as the author set it.
 */
export const keepsOwnAnchor = (endpoint: EndpointRef): boolean =>
	endpoint.anchor.kind === "connectPoint" &&
	!isConnectPointId(endpoint.anchor.id);

/**
 * The ends of `connectors` that sit on a side of their owner, as `createTakenEnds`
 * (`@jiscribe/layout`) takes them: an edge midpoint or an edge anchor, not a centre,
 * a free point or a declared connect point.
 */
export const listTakenEnds = (
	connectors: readonly ConnectorDoc[],
): TakenEnd[] => {
	const taken: TakenEnd[] = [];
	for (const connector of connectors) {
		for (const endpoint of [connector.source, connector.target]) {
			const ownerId = readOwnerId(endpoint);
			const edgeAnchor = toEquivalentEdgeAnchor(endpoint.anchor);
			if (ownerId !== undefined && edgeAnchor !== null) {
				taken.push({ ownerId, side: edgeAnchor.side, t: edgeAnchor.t });
			}
		}
	}
	return taken;
};
