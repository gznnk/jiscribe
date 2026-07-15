import { isTransformedFrame, type Point } from "@workspace/geometry";

import { adjustToOutline } from "./adjustToOutline";
import { resolveEndpoint } from "./resolveEndpoint";
import { isOrthogonalRouting } from "../../../../../schemas/objects/types/ConnectorRouting";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import type { ShapeOutlineRegistry } from "../../../../objects/registry/ShapeOutlineRegistry";
import { resolveOrthogonalRoute } from "../routing";

/**
 * Reads a shape's local outline polygon from the registry, or null when the
 * shape is not a frame or has no registered outline (rect/ellipse fall through
 * to their analytic handling in resolveEndpoint / adjustToOutline).
 */
const resolveShapeOutline = (
	obj: ObjectState | null | undefined,
	outlineRegistry: Pick<ShapeOutlineRegistry, "get"> | null | undefined,
): Point[] | null => {
	if (!obj || !outlineRegistry) {
		return null;
	}
	const provider = outlineRegistry.get(obj.type);
	if (!provider || !isTransformedFrame(obj)) {
		return null;
	}
	return provider({ width: obj.width, height: obj.height });
};

/**
 * Pure function that resolves both endpoints of a connector to actual coordinates. It handles
 * endpoint resolution and the outline adjustment for center anchors together. It takes the target
 * shapes individually rather than the whole objects map, so React component memoization stays effective.
 *
 * `waypoints` returns the intermediate points (in world coordinates) in source → target order as-is.
 * When drawing as a polyline, endpoint outline adjustment aims toward the adjacent waypoint (or the
 * opposite endpoint if there is none).
 *
 * @param connectorState - The connector state to resolve. Carries both endpoints, routing, and manual points
 * @param sourceObj - The owner shape of the source endpoint. null/undefined if unreferenced (free endpoint) or not found
 * @param targetObj - The owner shape of the target endpoint. null/undefined if unreferenced (free endpoint) or not found
 * @param outlineRegistry - Per-canvas ShapeOutlineRegistry. When provided, non-rect
 *   shapes attach on their true outline; omitted = bounding-box rect/ellipse handling
 * @returns The resolved source / target points and intermediate waypoints, or null if resolution fails
 */
export const resolveConnectorPoints = (
	connectorState: ConnectorState,
	sourceObj: ObjectState | null | undefined,
	targetObj: ObjectState | null | undefined,
	outlineRegistry?: Pick<ShapeOutlineRegistry, "get"> | null,
): { source: Point; target: Point; waypoints: Point[] } | null => {
	const sourceOutline = resolveShapeOutline(sourceObj, outlineRegistry);
	const targetOutline = resolveShapeOutline(targetObj, outlineRegistry);

	// Resolve endpoints to coordinates
	let sourcePoint = resolveEndpoint(
		connectorState.source,
		sourceObj,
		sourceOutline,
	);
	let targetPoint = resolveEndpoint(
		connectorState.target,
		targetObj,
		targetOutline,
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

	// A self-loop (both endpoints on the same shape) degenerates as a straight line, so regardless
	// of the routing setting, use the dedicated rectangular loop route (orthogonal).
	const isSelfLoop =
		!!sourceObj && !!targetObj && sourceObj.id === targetObj.id;

	// Automatic orthogonal routing: compute the path at render time and return it as waypoints (manual points are not used).
	// When routing is omitted, orthogonal is the default. Specify "straight" explicitly only when a straight line is wanted.
	if (isSelfLoop || isOrthogonalRouting(connectorState.routing)) {
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
