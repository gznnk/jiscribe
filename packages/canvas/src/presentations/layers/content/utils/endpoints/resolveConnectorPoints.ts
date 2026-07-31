import { isTransformedFrame, type Point, type Rect } from "@workspace/geometry";

import { adjustToOutline } from "./adjustToOutline";
import { resolveEndpoint } from "./resolveEndpoint";
import { isOrthogonalRouting } from "../../../../../schemas/objects/types/ConnectorRouting";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import type { ObjectAnchorRegionRegistry } from "../../../../objects/registry/ObjectAnchorRegionRegistry";
import type { ObjectOutlineRegistry } from "../../../../objects/registry/ObjectOutlineRegistry";
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
		| Pick<ObjectAnchorRegionRegistry, "get">
		| null
		| undefined,
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
 * @returns The resolved source / target points and intermediate waypoints, or null if resolution fails
 */
export const resolveConnectorPoints = (
	connectorState: ConnectorState,
	sourceObj: ObjectState | null | undefined,
	targetObj: ObjectState | null | undefined,
	outlineRegistry?: Pick<ObjectOutlineRegistry, "get"> | null,
	anchorRegionRegistry?: Pick<ObjectAnchorRegionRegistry, "get"> | null,
): { source: Point; target: Point; waypoints: Point[] } | null => {
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

	// Resolve endpoints to coordinates
	let sourcePoint = resolveEndpoint(
		connectorState.source,
		sourceObj,
		sourceOutline,
		sourceAnchorRegion,
	);
	let targetPoint = resolveEndpoint(
		connectorState.target,
		targetObj,
		targetOutline,
		targetAnchorRegion,
	);

	if (!sourcePoint || !targetPoint) {
		return null;
	}

	// Intermediate waypoints. The polyline passes through source → ...waypoints → target.
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

	// A self-loop (both endpoints on the same shape) degenerates as a straight line, so with no
	// vertices of its own it uses the dedicated rectangular loop route regardless of the routing
	// setting. Vertices override that: a route the author shaped by hand is no longer degenerate.
	const isSelfLoop =
		!!sourceObj && !!targetObj && sourceObj.id === targetObj.id;

	if (isOrthogonalRouting(connectorState.routing) || isSelfLoop) {
		// With vertices, `points` **is** the path: the corners are drawn exactly as stored, with only
		// the two next to the endpoints sliding along to keep their segment axis-aligned
		// (see alignVertexPath). Nothing is routed, so nothing is avoided — a shape moved across the
		// route is simply crossed.
		if (waypoints.length > 0) {
			return {
				source: sourcePoint,
				target: targetPoint,
				waypoints: alignVertexPath(
					waypoints,
					sourcePoint,
					targetPoint,
					calcEndpointDirection(
						connectorState.source.anchor,
						sourcePoint,
						waypoints[0],
						sourceObj,
					),
					calcEndpointDirection(
						connectorState.target.anchor,
						targetPoint,
						waypoints[waypoints.length - 1],
						targetObj,
					),
				),
			};
		}

		// No vertices: the whole path is the router's to choose.
		const path = resolveOrthogonalRoute(
			connectorState.source.anchor,
			connectorState.target.anchor,
			sourcePoint,
			targetPoint,
			sourceObj,
			targetObj,
		);
		return {
			source: path[0],
			target: path[path.length - 1],
			waypoints: path.slice(1, -1),
		};
	}

	return { source: sourcePoint, target: targetPoint, waypoints };
};
