import {
	calcFrameBoxFeatures,
	isTransformedFrame,
	snapToDirection,
	type OrthogonalDirection,
	type Point,
} from "@workspace/geometry";

import { routeOrthogonalConnector } from "./routeOrthogonalConnector";
import { routeSelfLoop } from "./selfLoop";
import type { OrthogonalConnectorEndpoint } from "./types";
import type { AnchorSpec } from "../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";

/**
 * Determines an endpoint's outward direction.
 *
 * For connectPoint (edge center), "shape center → resolved endpoint" is the outward normal.
 * Since this endpoint coordinate is resolved including rotation/flip, snapping the vector from the
 * center **automatically follows the shape's rotation** (no fixed up/right map is used).
 * Cases without center info such as center / free fall back to the direction toward the other endpoint.
 *
 * @param anchor - The endpoint's anchor spec. The kind changes how the outward direction is determined
 * @param point - The resolved endpoint coordinate
 * @param other - The opposite endpoint's coordinate (fallback target when there is no center info)
 * @param obj - The shape referenced by the endpoint. Used only when connectPoint and a frame shape
 * @returns The orthogonal direction in which the line exits the shape at that endpoint
 */
const endpointDirection = (
	anchor: AnchorSpec,
	point: Point,
	other: Point,
	obj: ObjectState | null | undefined,
): OrthogonalDirection => {
	if (anchor.kind === "connectPoint" && obj && isTransformedFrame(obj)) {
		const dx = point.x - obj.cx;
		const dy = point.y - obj.cy;
		if (dx !== 0 || dy !== 0) {
			return snapToDirection(dx, dy);
		}
	}
	return snapToDirection(other.x - point.x, other.y - point.y);
};

/**
 * Assembles an endpoint descriptor for the orthogonal router. Attaches the outward direction and an AABB to avoid to the resolved coordinate.
 *
 * @param anchor - The endpoint's anchor spec
 * @param point - The resolved endpoint coordinate
 * @param other - The opposite endpoint's coordinate (used for the outward-direction fallback)
 * @param obj - The shape referenced by the endpoint. If a frame shape, compute the AABB to avoid. free endpoints are null/undefined
 * @returns An endpoint bundling coordinate, outward direction, and AABB to avoid (box=null for a free endpoint)
 */
const buildEndpoint = (
	anchor: AnchorSpec,
	point: Point,
	other: Point,
	obj: ObjectState | null | undefined,
): OrthogonalConnectorEndpoint => ({
	point,
	direction: endpointDirection(anchor, point, other, obj),
	// If owned and a frame shape, pass the AABB to avoid. free endpoints are null.
	box: obj && isTransformedFrame(obj) ? calcFrameBoxFeatures(obj) : null,
});

/**
 * Generates the render path for a connector with routing === "orthogonal".
 *
 * From the resolved endpoint coordinates (center anchors are outline-adjusted) and the connected
 * shapes, returns a route of horizontal/vertical segments only (full path including endpoints).
 * Only the shapes at both ends are avoided.
 *
 * @param sourceAnchor - The source endpoint's anchor spec (used to determine the outward direction)
 * @param targetAnchor - The target endpoint's anchor spec
 * @param sourcePoint - The resolved source endpoint coordinate (center is outline-adjusted)
 * @param targetPoint - The resolved target endpoint coordinate
 * @param sourceObj - The owner shape of the source endpoint. If a frame shape, it is avoided. free endpoints are null/undefined
 * @param targetObj - The owner shape of the target endpoint
 * @returns The orthogonal full path including endpoints `[source, …, target]`
 */
export const resolveOrthogonalRoute = (
	sourceAnchor: AnchorSpec,
	targetAnchor: AnchorSpec,
	sourcePoint: Point,
	targetPoint: Point,
	sourceObj: ObjectState | null | undefined,
	targetObj: ObjectState | null | undefined,
): Point[] => {
	const source = buildEndpoint(
		sourceAnchor,
		sourcePoint,
		targetPoint,
		sourceObj,
	);
	const target = buildEndpoint(
		targetAnchor,
		targetPoint,
		sourcePoint,
		targetObj,
	);

	// A self-loop (both ends the same shape) uses a dedicated rectangular-loop route.
	// The normal orthogonal router treats both ends as separate obstacles, so it can degenerate for the same shape.
	if (
		sourceObj &&
		targetObj &&
		sourceObj.id === targetObj.id &&
		source.box &&
		target.box
	) {
		return routeSelfLoop(source, target);
	}

	return routeOrthogonalConnector(source, target);
};
