import { calcPolyBoundingBox } from "@jiscribe/geometry";
import type { BoundingBox, Point } from "@jiscribe/geometry";

import {
	resolveConnectorPoints,
	resolveEndpointOwner,
} from "../../rendering/layers/content/utils/endpoints";
import { calcConnectorLabelAnchor } from "../../rendering/layers/content/utils/label/calcConnectorLabelAnchor";
import { resolveConnectorLabelBox } from "../../rendering/objects/connector/ConnectorLabel/utils/connectorLabelLayout";
import type { ObjectAnchorRegionRegistry } from "../../rendering/objects/registry/ObjectAnchorRegionRegistry";
import type { ObjectExtraConnectPointsRegistry } from "../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectOutlineRegistry } from "../../rendering/objects/registry/ObjectOutlineRegistry";
import type { ConnectorLabel } from "../../schemas/objects/connector/ConnectorDoc";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connector/ConnectorState";

/**
 * Collects every point along a connector: the dynamically resolved endpoints
 * (including outline adjustment) plus the intermediate waypoints.
 *
 * Returns null if the endpoints cannot be resolved (e.g. a referenced object
 * was removed).
 *
 * @param connector - The connector whose path is collected
 * @param objects - The object map, used to resolve the endpoint owners
 * @param outlineRegistry - Per-canvas ObjectOutlineRegistry. Pass it whenever the points
 *   are compared against a pointer position: omitting it approximates an outline shape by
 *   its bounding box, putting the path off the drawn one
 * @param anchorRegionRegistry - Per-canvas ObjectAnchorRegionRegistry, the companion of
 *   `outlineRegistry`; omitted = edge anchors centered on the full bounding box
 * @param extraConnectPointsRegistry - Per-canvas ObjectExtraConnectPointsRegistry, the other
 *   companion of `outlineRegistry`; omitted = an endpoint on a type-declared anchor collapses
 *   onto the owner's center
 */
export const collectConnectorPoints = (
	connector: ConnectorState,
	objects: Record<string, ObjectState>,
	outlineRegistry?: Pick<ObjectOutlineRegistry, "get"> | null,
	anchorRegionRegistry?: Pick<ObjectAnchorRegionRegistry, "get"> | null,
	extraConnectPointsRegistry?: Pick<
		ObjectExtraConnectPointsRegistry,
		"get"
	> | null,
): Point[] | null => {
	const sourceObj = resolveEndpointOwner(objects, connector.source);
	const targetObj = resolveEndpointOwner(objects, connector.target);

	const resolved = resolveConnectorPoints(
		connector,
		sourceObj,
		targetObj,
		outlineRegistry,
		anchorRegionRegistry,
		extraConnectPointsRegistry,
	);
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
 *
 * The path is resolved without the geometry registries (outline / anchor region /
 * extra connect points), so on such a shape the endpoints land on the bounding box
 * rather than the drawn silhouette. The difference stays within the owner shape's own
 * bounds and is absorbed by the margins the consumers already add (zoom-to-fit, export
 * viewBox, culling) — unlike a path compared against a pointer position, which
 * has no such slack and must pass the registries in.
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
