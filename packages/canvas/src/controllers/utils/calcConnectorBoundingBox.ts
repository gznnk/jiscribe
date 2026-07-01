import type { BoundingBox } from "@workspace/geometry";

import { resolveConnectorPoints } from "../../presentations/layers/content/utils/endpoints";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";

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
	const sourceObj = connector.source.owner
		? objects[connector.source.owner.id]
		: undefined;
	const targetObj = connector.target.owner
		? objects[connector.target.owner.id]
		: undefined;

	const resolved = resolveConnectorPoints(connector, sourceObj, targetObj);
	if (!resolved) {
		return null;
	}

	let left = Infinity;
	let right = -Infinity;
	let top = Infinity;
	let bottom = -Infinity;

	for (const p of [resolved.source, ...resolved.waypoints, resolved.target]) {
		left = Math.min(left, p.x);
		right = Math.max(right, p.x);
		top = Math.min(top, p.y);
		bottom = Math.max(bottom, p.y);
	}

	return { left, right, top, bottom };
};
