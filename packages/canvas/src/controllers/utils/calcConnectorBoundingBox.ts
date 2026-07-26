import { calcPolyBoundingBox } from "@workspace/geometry";
import type { BoundingBox, Point } from "@workspace/geometry";

import {
	resolveConnectorPoints,
	resolveEndpointOwner,
} from "../../presentations/layers/content/utils/endpoints";
import { calcConnectorLabelAnchor } from "../../presentations/layers/content/utils/label/calcConnectorLabelAnchor";
import { resolveConnectorLabelBox } from "../../presentations/objects/connections/ConnectorLabel/utils/connectorLabelLayout";
import type { ConnectorLabel } from "../../schemas/objects/connections/connector/ConnectorDoc";
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
 * Two opposite corners of the label box, which is enough to widen an
 * axis-aligned bound (the label is never rotated). Empty when there is nothing
 * to draw or the anchor is unresolvable.
 */
const collectLabelCorners = (
	label: ConnectorLabel | undefined,
	connectorPoints: readonly Point[],
): Point[] => {
	if (!label || label.text === "") {
		return [];
	}

	const anchor = calcConnectorLabelAnchor(
		connectorPoints,
		label.position,
		label.offset,
	);
	if (!anchor) {
		return [];
	}

	const { width, height } = resolveConnectorLabelBox(label);
	return [
		{ x: anchor.x - width / 2, y: anchor.y - height / 2 },
		{ x: anchor.x + width / 2, y: anchor.y + height / 2 },
	];
};

/**
 * Computes the bounding box of an entire connector, path and label together.
 *
 * Dynamically resolves the endpoints (including outline adjustment) via
 * resolveConnectorPoints and returns a range that also covers the intermediate
 * waypoints. In orthogonal routing the bend points are included in the waypoints,
 * so they are covered by the range as well.
 *
 * A non-empty label is part of the connector's extent: its box (axis aligned,
 * centered on the anchor derived from `label.position` / `label.offset`) is
 * unioned in, so zoom-to-fit and the export viewBox do not crop it and viewport
 * culling does not drop a connector whose label is still on screen.
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

	return calcPolyBoundingBox([
		...connectorPoints,
		...collectLabelCorners(connector.label, connectorPoints),
	]);
};
