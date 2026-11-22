import type { EndpointOwnerShape } from "@jiscribe/doc/model/objects/connector/EndpointOwner";
import type { ExtraConnectPoint } from "@jiscribe/doc/model/objects/connector/ExtraConnectPoint";
import {
	resolveConnectorEnds,
	resolveStoredConnectorWaypoints,
} from "@jiscribe/doc/model/objects/connector/resolveConnectorEnds";
import { isTransformedFrame, type Point, type Rect } from "@jiscribe/geometry";

import { readCachedObjectOutline } from "./readCachedObjectOutline";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../states/objects/connector/ConnectorState";
import type { ObjectAnchorRegionRegistry } from "../../../registry/ObjectAnchorRegionRegistry";
import type { ObjectExtraConnectPointsRegistry } from "../../../registry/ObjectExtraConnectPointsRegistry";
import type { ObjectOutlineRegistry } from "../../../registry/ObjectOutlineRegistry";
import { resolveOrthogonalRoute } from "../routing";

/**
 * Reads a shape's local outline polygon from the registry (readCachedObjectOutline),
 * or null when the shape is not a frame or has no registered outline (rect/ellipse
 * fall through to their analytic handling in resolveEndpoint / adjustToOutline).
 */
const resolveOutline = (
	obj: ObjectState | null | undefined,
	outlineRegistry: Pick<ObjectOutlineRegistry, "get"> | null | undefined,
): readonly Point[] | null => {
	// The registry lookup goes first: most types register no outline, and the
	// frame check reads seven fields.
	if (
		!obj ||
		!outlineRegistry ||
		outlineRegistry.get(obj.type) === undefined ||
		!isTransformedFrame(obj)
	) {
		return null;
	}
	return readCachedObjectOutline(obj, outlineRegistry) ?? null;
};

/**
 * Reads a shape's local anchor region from the registry, or null when the shape
 * is not a frame or has no registered region (the edge anchors then use the
 * full bounding box).
 */
const resolveAnchorRegion = (
	obj: ObjectState | null | undefined,
	anchorRegionRegistry:
		Pick<ObjectAnchorRegionRegistry, "get"> | null | undefined,
): Rect | null => {
	if (!obj || !anchorRegionRegistry) {
		return null;
	}
	const calculator = anchorRegionRegistry.get(obj.type);
	if (!calculator || !isTransformedFrame(obj)) {
		return null;
	}
	return calculator(obj);
};

/**
 * Reads the extra connection points a shape's type declares, or null when the
 * shape is not a frame or has no registered calculator (only the four edge
 * anchors are then offered).
 */
const resolveExtraConnectPoints = (
	obj: ObjectState | null | undefined,
	extraConnectPointsRegistry:
		Pick<ObjectExtraConnectPointsRegistry, "get"> | null | undefined,
): readonly ExtraConnectPoint[] | null => {
	if (!obj || !extraConnectPointsRegistry) {
		return null;
	}
	const calculator = extraConnectPointsRegistry.get(obj.type);
	if (!calculator || !isTransformedFrame(obj)) {
		return null;
	}
	return calculator(obj);
};

/**
 * One end's owner with what its type registers on this canvas about where an
 * end lands on it, read once from the registries (the outline through
 * readCachedObjectOutline) for the doc-side resolution to take as values.
 *
 * @param obj - The owner shape; null/undefined for a free endpoint or a missing owner, which reads every declaration as absent
 * @param outlineRegistry - Per-canvas ObjectOutlineRegistry; omitted = the outline the owner's geometry implies
 * @param anchorRegionRegistry - Per-canvas ObjectAnchorRegionRegistry; omitted = the full bounding box
 * @param extraConnectPointsRegistry - Per-canvas ObjectExtraConnectPointsRegistry; omitted = the four edge anchors only
 */
export const readEndpointOwnerShape = (
	obj: ObjectState | null | undefined,
	outlineRegistry?: Pick<ObjectOutlineRegistry, "get"> | null,
	anchorRegionRegistry?: Pick<ObjectAnchorRegionRegistry, "get"> | null,
	extraConnectPointsRegistry?: Pick<
		ObjectExtraConnectPointsRegistry,
		"get"
	> | null,
): EndpointOwnerShape => ({
	owner: obj,
	outline: resolveOutline(obj, outlineRegistry),
	anchorRegion: resolveAnchorRegion(obj, anchorRegionRegistry),
	extraConnectPoints: resolveExtraConnectPoints(
		obj,
		extraConnectPointsRegistry,
	),
});

/**
 * Pure function that resolves both endpoints of a connector to actual coordinates. It handles
 * endpoint resolution and the outline adjustment for center anchors together. It takes the target
 * shapes individually rather than the whole objects map, so React component memoization stays effective.
 *
 * `waypoints` returns the intermediate points of the drawn path (in world coordinates) in
 * source → target order: the connector's own vertices when it has any (with the two next to the
 * endpoints aligned to them), otherwise the corners the router chose. Endpoint outline adjustment
 * aims toward the adjacent point (or the opposite endpoint if there is none). Everything but the
 * router's choice is resolved by the doc layer (resolveConnectorEnds,
 * resolveStoredConnectorWaypoints), which a headless consumer calls the same way.
 *
 * @param connectorState - The connector state to resolve. Carries both endpoints, routing, and manual points
 * @param sourceObj - The owner shape of the source endpoint. null/undefined if unreferenced (free endpoint) or not found
 * @param targetObj - The owner shape of the target endpoint. null/undefined if unreferenced (free endpoint) or not found
 * @param outlineRegistry - Per-canvas ObjectOutlineRegistry. When provided, non-rect
 *   shapes attach on their true outline; omitted = bounding-box rect/ellipse handling
 * @param anchorRegionRegistry - Per-canvas ObjectAnchorRegionRegistry. When provided, a shape
 *   whose silhouette tapers centers its edge anchors on the declared band; omitted = full bounding box
 * @param extraConnectPointsRegistry - Per-canvas ObjectExtraConnectPointsRegistry. When provided,
 *   an endpoint may name an anchor the shape's type declares itself (the brace's `tip`); omitted =
 *   such an endpoint degrades to the shape's center
 * @returns The resolved source / target points and intermediate waypoints, or null if resolution fails
 */
export const resolveConnectorPoints = (
	connectorState: ConnectorState,
	sourceObj: ObjectState | null | undefined,
	targetObj: ObjectState | null | undefined,
	outlineRegistry?: Pick<ObjectOutlineRegistry, "get"> | null,
	anchorRegionRegistry?: Pick<ObjectAnchorRegionRegistry, "get"> | null,
	extraConnectPointsRegistry?: Pick<
		ObjectExtraConnectPointsRegistry,
		"get"
	> | null,
): { source: Point; target: Point; waypoints: Point[] } | null => {
	const sourceShape = readEndpointOwnerShape(
		sourceObj,
		outlineRegistry,
		anchorRegionRegistry,
		extraConnectPointsRegistry,
	);
	const targetShape = readEndpointOwnerShape(
		targetObj,
		outlineRegistry,
		anchorRegionRegistry,
		extraConnectPointsRegistry,
	);
	const ends = resolveConnectorEnds(connectorState, sourceShape, targetShape);
	if (!ends) {
		return null;
	}

	const waypoints = resolveStoredConnectorWaypoints(
		connectorState,
		ends,
		sourceShape,
		targetShape,
	);
	if (waypoints !== null) {
		return { source: ends.source, target: ends.target, waypoints };
	}

	const path = resolveOrthogonalRoute(
		connectorState.source.anchor,
		connectorState.target.anchor,
		ends.source,
		ends.target,
		sourceObj,
		targetObj,
		sourceShape.extraConnectPoints,
		targetShape.extraConnectPoints,
	);
	return {
		source: path[0],
		target: path[path.length - 1],
		waypoints: path.slice(1, -1),
	};
};

/**
 * The drawn path of a resolved connector as one point list.
 *
 * @param resolved - What {@link resolveConnectorPoints} returned, past its null check
 * @returns `source`, then the waypoints, then `target`, in world coordinates; a new array each call
 */
export const listConnectorPathPoints = (resolved: {
	source: Point;
	target: Point;
	waypoints: readonly Point[];
}): Point[] => [resolved.source, ...resolved.waypoints, resolved.target];
