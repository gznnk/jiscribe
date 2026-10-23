import { isConnectorDrawnOrthogonal } from "@jiscribe/doc/model/objects/connector/isConnectorDrawnOrthogonal";
import { calcPolyBoundingBox, type BoundingBox } from "@jiscribe/geometry";

import { resolveConnectorEnds } from "./resolveConnectorPoints";
import type { ObjectAnchorRegionRegistry } from "../../rendering/objects/registry/ObjectAnchorRegionRegistry";
import type { ObjectExtraConnectPointsRegistry } from "../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectOutlineRegistry } from "../../rendering/objects/registry/ObjectOutlineRegistry";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connector/ConnectorState";
import { calcOrthogonalRouteBound } from "../routing";

/**
 * A box that contains the path resolveConnectorPoints resolves, found
 * without routing it: the endpoints are resolved as for the path, and only the
 * route between them is bounded instead of chosen. A straight line or a stored
 * vertex list is boxed exactly (alignVertexPath only slides the end vertices
 * onto the endpoints' coordinates); a route the router chooses is bounded by
 * calcOrthogonalRouteBound.
 *
 * @param connectorState - The connector to bound; only its endpoints, routing and `points` are read
 * @param sourceObj - The owner shape of the source endpoint; null/undefined for a free endpoint or a missing owner
 * @param targetObj - The owner shape of the target endpoint; null/undefined for a free endpoint or a missing owner
 * @param outlineRegistry - Per-canvas ObjectOutlineRegistry; pass the one the path is drawn through, or the bound misses it
 * @param anchorRegionRegistry - Per-canvas ObjectAnchorRegionRegistry, under the same condition
 * @param extraConnectPointsRegistry - Per-canvas ObjectExtraConnectPointsRegistry, under the same condition
 * @returns A box in world coordinates containing every path point, the label excluded; null
 *   exactly when resolveConnectorPoints returns null (an endpoint does not resolve)
 */
export const calcConnectorPathBound = (
	connectorState: ConnectorState,
	sourceObj: ObjectState | null | undefined,
	targetObj: ObjectState | null | undefined,
	outlineRegistry: Pick<ObjectOutlineRegistry, "get">,
	anchorRegionRegistry: Pick<ObjectAnchorRegionRegistry, "get">,
	extraConnectPointsRegistry: Pick<ObjectExtraConnectPointsRegistry, "get">,
): BoundingBox | null => {
	const ends = resolveConnectorEnds(
		connectorState,
		sourceObj,
		targetObj,
		outlineRegistry,
		anchorRegionRegistry,
		extraConnectPointsRegistry,
	);
	if (!ends) {
		return null;
	}
	const waypoints = connectorState.points ?? [];
	if (isConnectorDrawnOrthogonal(connectorState) && waypoints.length === 0) {
		return calcOrthogonalRouteBound(
			ends.source,
			ends.target,
			sourceObj,
			targetObj,
		);
	}
	return calcPolyBoundingBox([ends.source, ...waypoints, ends.target]);
};
