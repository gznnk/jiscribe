import type { Point } from "@jiscribe/geometry";

import { adjustToOutline } from "./adjustToOutline";
import { alignVertexPath } from "./alignVertexPath";
import { calcEndpointDirection } from "./calcEndpointDirection";
import type { EndpointOwnerShape } from "./EndpointOwner";
import { isConnectorDrawnOrthogonal } from "./isConnectorDrawnOrthogonal";
import { resolveEndpoint } from "./resolveEndpoint";
import type { ConnectorRouting } from "../types/ConnectorRouting";
import type { EndpointRef } from "../types/EndpointRef";

/**
 * The connector fields the path resolution reads, which a `ConnectorDoc` and a
 * canvas connector state both carry.
 */
export type ConnectorPathFields = {
	source: EndpointRef;
	target: EndpointRef;
	routing?: ConnectorRouting;
	/** The stored vertices in world coordinates, source → target; absent reads as none. */
	points?: Point[];
};

/** Both ends of a connector in world coordinates, as {@link resolveConnectorEnds} resolves them. */
export type ResolvedConnectorEnds = {
	source: Point;
	target: Point;
};

/**
 * The two endpoints of a connector as they are drawn, before any route between
 * them: each anchor resolved on its owner, and a center anchor snapped onto the
 * outline toward the point the line heads to next (the first or last stored
 * vertex, otherwise the opposite endpoint).
 *
 * @param connector - The connector whose endpoints are resolved; its `points` aim a center anchor
 * @param sourceShape - The source end's owner and what its type declares; `owner` null/undefined for a free end or a missing owner
 * @param targetShape - The target end's owner, likewise
 * @returns The endpoints in world coordinates, or null when an owned end has no
 *   owner, its owner offers nothing to resolve it on, or a center anchor's line
 *   toward the next point misses the outline
 */
export const resolveConnectorEnds = (
	connector: ConnectorPathFields,
	sourceShape: EndpointOwnerShape,
	targetShape: EndpointOwnerShape,
): ResolvedConnectorEnds | null => {
	let sourcePoint = resolveEndpoint(
		connector.source,
		sourceShape.owner,
		sourceShape.outline,
		sourceShape.anchorRegion,
		sourceShape.extraConnectPoints,
	);
	let targetPoint = resolveEndpoint(
		connector.target,
		targetShape.owner,
		targetShape.outline,
		targetShape.anchorRegion,
		targetShape.extraConnectPoints,
	);

	if (!sourcePoint || !targetPoint) {
		return null;
	}

	const waypoints = connector.points ?? [];

	// Outline adjustment for center anchors aims toward "the point the line heads to next".
	// Use the first/last waypoint if present, otherwise the opposite endpoint.
	const sourceToward = waypoints[0] ?? targetPoint;
	const targetToward = waypoints[waypoints.length - 1] ?? sourcePoint;

	// Adjust to outline for center anchors (true outline when available, else rect/ellipse)
	if (connector.source.anchor.kind === "center") {
		sourcePoint = adjustToOutline(
			sourcePoint,
			sourceToward,
			sourceShape.owner,
			sourceShape.outline,
		);
		if (!sourcePoint) {
			return null;
		}
	}

	if (connector.target.anchor.kind === "center") {
		targetPoint = adjustToOutline(
			targetPoint,
			targetToward,
			targetShape.owner,
			targetShape.outline,
		);
		if (!targetPoint) {
			return null;
		}
	}

	return { source: sourcePoint, target: targetPoint };
};

/**
 * The intermediate points of a connector's drawn path that its stored vertices
 * decide, in world coordinates and source → target order: the vertices as
 * stored, with the two next to the endpoints aligned to them when the line is
 * drawn right-angled (see alignVertexPath).
 *
 * @param connector - The connector the ends were resolved for
 * @param ends - What {@link resolveConnectorEnds} returned for it
 * @param sourceShape - The source end's owner, as passed to resolveConnectorEnds; read for the direction the line leaves it
 * @param targetShape - The target end's owner, likewise
 * @returns The waypoints — `connector.points` itself when nothing is aligned — or
 *   null for a right-angled connector with no stored vertices, whose whole path
 *   is the router's to choose
 */
export const resolveStoredConnectorWaypoints = (
	connector: ConnectorPathFields,
	ends: ResolvedConnectorEnds,
	sourceShape: EndpointOwnerShape,
	targetShape: EndpointOwnerShape,
): Point[] | null => {
	const waypoints = connector.points ?? [];

	// A self-loop (both endpoints on the same shape) degenerates as a straight line, so it uses the
	// dedicated rectangular loop route regardless of the routing setting — which is why the branch
	// asks how the line is drawn, not what `routing` says (see isConnectorDrawnOrthogonal). Vertices
	// override the route itself: a path the author shaped by hand is no longer degenerate.
	if (!isConnectorDrawnOrthogonal(connector)) {
		return waypoints;
	}

	// No vertices: the whole path is the router's to choose.
	if (waypoints.length === 0) {
		return null;
	}

	// With vertices, `points` **is** the path: the corners are drawn exactly as stored, with only
	// the two next to the endpoints sliding along to keep their segment axis-aligned
	// (see alignVertexPath). Nothing is routed, so nothing is avoided — a shape moved across the
	// route is simply crossed.
	return alignVertexPath(
		waypoints,
		ends.source,
		ends.target,
		calcEndpointDirection(
			connector.source.anchor,
			ends.source,
			waypoints[0],
			sourceShape.owner,
			sourceShape.extraConnectPoints,
		),
		calcEndpointDirection(
			connector.target.anchor,
			ends.target,
			waypoints[waypoints.length - 1],
			targetShape.owner,
			targetShape.extraConnectPoints,
		),
	);
};
