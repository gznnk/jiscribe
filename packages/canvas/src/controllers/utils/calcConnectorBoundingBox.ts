import { calcPolyBoundingBox } from "@workspace/geometry";
import type { BoundingBox, Point } from "@workspace/geometry";

import {
	resolveConnectorPoints,
	resolveEndpointOwner,
} from "../../presentations/layers/content/utils/endpoints";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";

/**
 * Collects every point along a connector: the dynamically resolved endpoints
 * (including outline adjustment) plus the intermediate waypoints.
 *
 * Returns null if the endpoints cannot be resolved (e.g. a referenced object
 * was removed).
 */
export const collectConnectorPoints = (
	connector: ConnectorState,
	objects: Record<string, ObjectState>,
): Point[] | null => {
	const sourceObj = resolveEndpointOwner(objects, connector.source);
	const targetObj = resolveEndpointOwner(objects, connector.target);

	const resolved = resolveConnectorPoints(connector, sourceObj, targetObj);
	if (!resolved) {
		return null;
	}

	return [resolved.source, ...resolved.waypoints, resolved.target];
};

/**
 * Computes the bounding box of an entire connector.
 *
 * Dynamically resolves the endpoints (including outline adjustment) via
 * resolveConnectorPoints and returns a range that also covers the intermediate
 * waypoints. In orthogonal routing the bend points are included in the waypoints,
 * so they are covered by the range as well.
 * Returns null if the endpoints cannot be resolved (e.g. a referenced object was removed).
 */
export const calcConnectorBoundingBox = (
	connector: ConnectorState,
	objects: Record<string, ObjectState>,
): BoundingBox | null => {
	const connectorPoints = collectConnectorPoints(connector, objects);
	if (!connectorPoints) {
		return null;
	}

	return calcPolyBoundingBox(connectorPoints);
};
