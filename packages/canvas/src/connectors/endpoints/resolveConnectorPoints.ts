import { isConnectorDrawnOrthogonal } from "@jiscribe/doc/model/objects/connector/isConnectorDrawnOrthogonal";
import { isTransformedFrame, type Point, type Rect } from "@jiscribe/geometry";

import { adjustToOutline } from "./adjustToOutline";
import { resolveEndpoint } from "./resolveEndpoint";
import type { ObjectAnchorRegionRegistry } from "../../rendering/objects/registry/ObjectAnchorRegionRegistry";
import type {
	ExtraConnectPoint,
	ObjectExtraConnectPointsRegistry,
} from "../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectOutlineRegistry } from "../../rendering/objects/registry/ObjectOutlineRegistry";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connector/ConnectorState";
import {
	alignVertexPath,
	calcEndpointDirection,
	resolveOrthogonalRoute,
} from "../routing";

/**
 * Reads a shape's local outline polygon from the registry, or null when the
 * shape is not a frame or has no registered outline (rect/ellipse fall through
 * to their analytic handling in resolveEndpoint / adjustToOutline).
 */
const resolveOutline = (
	obj: ObjectState | null | undefined,
	outlineRegistry: Pick<ObjectOutlineRegistry, "get"> | null | undefined,
): Point[] | null => {
	if (!obj || !outlineRegistry) {
		return null;
	}
	const calculator = outlineRegistry.get(obj.type);
	if (!calculator || !isTransformedFrame(obj)) {
		return null;
	}
	return calculator(obj);
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
 * The two endpoints of a connector as they are drawn, before any route between
 * them: each anchor resolved on its owner, and a center anchor snapped onto the
 * outline toward the point the line heads to next (the first or last stored
 * vertex, otherwise the opposite endpoint). The first half of
 * {@link resolveConnectorPoints}, which routes from exactly these points.
 *
 * @param connectorState - The connector whose endpoints are resolved; its `points` aim a center anchor
 * @param sourceObj - The owner shape of the source endpoint; null/undefined for a free endpoint or a missing owner
 * @param targetObj - The owner shape of the target endpoint; null/undefined for a free endpoint or a missing owner
 * @param outlineRegistry - Per-canvas ObjectOutlineRegistry, as for resolveConnectorPoints
 * @param anchorRegionRegistry - Per-canvas ObjectAnchorRegionRegistry, as for resolveConnectorPoints
 * @param extraConnectPointsRegistry - Per-canvas ObjectExtraConnectPointsRegistry, as for resolveConnectorPoints
 * @returns The endpoints in world coordinates with each owner's declared extra anchors (read
 *   once here for the route), or null exactly when resolveConnectorPoints returns null
 */
export const resolveConnectorEnds = (
	connectorState: ConnectorState,
	sourceObj: ObjectState | null | undefined,
	targetObj: ObjectState | null | undefined,
	outlineRegistry?: Pick<ObjectOutlineRegistry, "get"> | null,
	anchorRegionRegistry?: Pick<ObjectAnchorRegionRegistry, "get"> | null,
	extraConnectPointsRegistry?: Pick<
		ObjectExtraConnectPointsRegistry,
		"get"
	> | null,
): {
	source: Point;
	target: Point;
	sourceExtraConnectPoints: readonly ExtraConnectPoint[] | null;
	targetExtraConnectPoints: readonly ExtraConnectPoint[] | null;
} | null => {
	const sourceOutline = resolveOutline(sourceObj, outlineRegistry);
	const targetOutline = resolveOutline(targetObj, outlineRegistry);
	const sourceAnchorRegion = resolveAnchorRegion(
		sourceObj,
		anchorRegionRegistry,
	);
	const targetAnchorRegion = resolveAnchorRegion(
		targetObj,
		anchorRegionRegistry,
	);
	const sourceExtraConnectPoints = resolveExtraConnectPoints(
		sourceObj,
		extraConnectPointsRegistry,
	);
	const targetExtraConnectPoints = resolveExtraConnectPoints(
		targetObj,
		extraConnectPointsRegistry,
	);

	// Resolve endpoints to coordinates
	let sourcePoint = resolveEndpoint(
		connectorState.source,
		sourceObj,
		sourceOutline,
		sourceAnchorRegion,
		sourceExtraConnectPoints,
	);
	let targetPoint = resolveEndpoint(
		connectorState.target,
		targetObj,
		targetOutline,
		targetAnchorRegion,
		targetExtraConnectPoints,
	);

	if (!sourcePoint || !targetPoint) {
		return null;
	}

	const waypoints = connectorState.points ?? [];

	// Outline adjustment for center anchors aims toward "the point the line heads to next".
	// Use the first/last waypoint if present, otherwise the opposite endpoint.
	const sourceToward = waypoints[0] ?? targetPoint;
	const targetToward = waypoints[waypoints.length - 1] ?? sourcePoint;

	// Adjust to outline for center anchors (true outline when available, else rect/ellipse)
	if (connectorState.source.anchor.kind === "center") {
		sourcePoint = adjustToOutline(
			sourcePoint,
			sourceToward,
			sourceObj,
			sourceOutline,
		);
		if (!sourcePoint) {
			return null;
		}
	}

	if (connectorState.target.anchor.kind === "center") {
		targetPoint = adjustToOutline(
			targetPoint,
			targetToward,
			targetObj,
			targetOutline,
		);
		if (!targetPoint) {
			return null;
		}
	}

	return {
		source: sourcePoint,
		target: targetPoint,
		sourceExtraConnectPoints,
		targetExtraConnectPoints,
	};
};

/**
 * Pure function that resolves both endpoints of a connector to actual coordinates. It handles
 * endpoint resolution and the outline adjustment for center anchors together. It takes the target
 * shapes individually rather than the whole objects map, so React component memoization stays effective.
 *
 * `waypoints` returns the intermediate points of the drawn path (in world coordinates) in
 * source → target order: the connector's own vertices when it has any (with the two next to the
 * endpoints aligned to them), otherwise the corners the router chose. Endpoint outline adjustment
 * aims toward the adjacent point (or the opposite endpoint if there is none).
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

	// Intermediate waypoints. The polyline passes through source → ...waypoints → target.
	const waypoints = connectorState.points ?? [];

	// A self-loop (both endpoints on the same shape) degenerates as a straight line, so it uses the
	// dedicated rectangular loop route regardless of the routing setting — which is why the branch
	// asks how the line is drawn, not what `routing` says (see isConnectorDrawnOrthogonal). Vertices
	// override the route itself: a path the author shaped by hand is no longer degenerate.
	if (isConnectorDrawnOrthogonal(connectorState)) {
		// With vertices, `points` **is** the path: the corners are drawn exactly as stored, with only
		// the two next to the endpoints sliding along to keep their segment axis-aligned
		// (see alignVertexPath). Nothing is routed, so nothing is avoided — a shape moved across the
		// route is simply crossed.
		if (waypoints.length > 0) {
			return {
				source: ends.source,
				target: ends.target,
				waypoints: alignVertexPath(
					waypoints,
					ends.source,
					ends.target,
					calcEndpointDirection(
						connectorState.source.anchor,
						ends.source,
						waypoints[0],
						sourceObj,
						ends.sourceExtraConnectPoints,
					),
					calcEndpointDirection(
						connectorState.target.anchor,
						ends.target,
						waypoints[waypoints.length - 1],
						targetObj,
						ends.targetExtraConnectPoints,
					),
				),
			};
		}

		// No vertices: the whole path is the router's to choose.
		const path = resolveOrthogonalRoute(
			connectorState.source.anchor,
			connectorState.target.anchor,
			ends.source,
			ends.target,
			sourceObj,
			targetObj,
			ends.sourceExtraConnectPoints,
			ends.targetExtraConnectPoints,
		);
		return {
			source: path[0],
			target: path[path.length - 1],
			waypoints: path.slice(1, -1),
		};
	}

	return { source: ends.source, target: ends.target, waypoints };
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
