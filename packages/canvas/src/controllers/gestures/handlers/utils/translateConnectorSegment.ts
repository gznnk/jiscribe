import { roundToDecimal } from "@workspace/geometry";
import type { Point } from "@workspace/geometry";

import { PRECISION } from "../../../../constants/precision";
import {
	isFreeEndpointRef,
	type EndpointRef,
} from "../../../../schemas/objects/types/EndpointRef";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import { isConnectorSegmentFreelyMovable } from "../../../../states/objects/connections/connector/isConnectorSegmentFreelyMovable";

/** The fields a translation rewrites, ready to spread onto the connector. */
export type TranslatedConnectorSegment = {
	points: Point[];
	source: EndpointRef;
	target: EndpointRef;
};

/**
 * The coordinate at a position of the drawn path `[source, ...points, target]`, or null when that
 * position is an owned endpoint — pinned to its shape's face, so it has no coordinate of its own to
 * rewrite.
 */
const readPathPoint = (
	connector: ConnectorState,
	pathIndex: number,
): Point | null => {
	if (pathIndex === 0) {
		return isFreeEndpointRef(connector.source)
			? connector.source.anchor.point
			: null;
	}
	if (pathIndex === connector.points.length + 1) {
		return isFreeEndpointRef(connector.target)
			? connector.target.anchor.point
			: null;
	}
	return connector.points[pathIndex - 1] ?? null;
};

/**
 * The two ends of a segment that can be dragged anywhere, or null when it cannot
 * (see isConnectorSegmentFreelyMovable).
 *
 * Read before the drag is applied, so a caller can snap against where the ends would land.
 *
 * @param connector - The connector as it was when the drag started. Straight routing only: under
 *   orthogonal the drawn corners are not `points` alone, and a segment moves on one axis instead
 * @param segmentIndex - The segment, spanning path position `segmentIndex` → `segmentIndex + 1`
 * @returns The ends in path order, or null for a pinned end or an out-of-range index
 */
export const getConnectorSegmentEnds = (
	connector: ConnectorState,
	segmentIndex: number,
): { start: Point; end: Point } | null => {
	const pathLength = connector.points.length + 2;
	if (
		!isConnectorSegmentFreelyMovable(
			segmentIndex,
			pathLength,
			isFreeEndpointRef(connector.source),
			isFreeEndpointRef(connector.target),
		)
	) {
		return null;
	}
	const start = readPathPoint(connector, segmentIndex);
	const end = readPathPoint(connector, segmentIndex + 1);
	return start && end ? { start, end } : null;
};

/**
 * Moves both ends of a straight connector's segment by the same offset.
 *
 * Only the two ends move. The segments on either side keep their far end where it was and stretch
 * to follow, which is what makes the grabbed one look like it slides through the line — there is no
 * run to carry along as under orthogonal, and no corner to clean up afterwards, since any angle is
 * already a legal one here. A vertex dragged onto an endpoint is left where the drag put it,
 * matching what the vertex handles already do.
 *
 * @param connector - The connector as it was when the drag started
 * @param segmentIndex - The segment, spanning path position `segmentIndex` → `segmentIndex + 1`
 * @param delta - How far to move, in world units
 * @returns The rewritten `points` / `source` / `target` with coordinates rounded to
 *   PRECISION.COORDINATE, or null when the segment cannot be freely moved
 */
export const translateConnectorSegment = (
	connector: ConnectorState,
	segmentIndex: number,
	delta: Point,
): TranslatedConnectorSegment | null => {
	if (!getConnectorSegmentEnds(connector, segmentIndex)) {
		return null;
	}

	const moved = (point: Point): Point => ({
		x: roundToDecimal(point.x + delta.x, PRECISION.COORDINATE),
		y: roundToDecimal(point.y + delta.y, PRECISION.COORDINATE),
	});
	// A free endpoint is rebuilt rather than spread, so the result is a FreeEndpointRef by
	// construction and cannot carry an owner over.
	const movedEndpoint = (endpoint: EndpointRef): EndpointRef =>
		isFreeEndpointRef(endpoint)
			? { anchor: { kind: "free", point: moved(endpoint.anchor.point) } }
			: endpoint;

	const lastPathIndex = connector.points.length + 1;
	return {
		points: connector.points.map((point, index) =>
			// Vertex i sits at path position i + 1.
			index + 1 === segmentIndex || index + 1 === segmentIndex + 1
				? moved(point)
				: point,
		),
		source:
			segmentIndex === 0 ? movedEndpoint(connector.source) : connector.source,
		target:
			segmentIndex + 1 === lastPathIndex
				? movedEndpoint(connector.target)
				: connector.target,
	};
};
