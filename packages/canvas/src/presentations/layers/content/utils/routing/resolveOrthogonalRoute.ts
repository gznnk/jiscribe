import {
	calcFrameBoxFeatures,
	isTransformedFrame,
	type Point,
} from "@workspace/geometry";

import { calcEndpointDirection } from "./endpointDirection";
import { routeOrthogonalConnector } from "./routeOrthogonalConnector";
import { routeSelfLoop } from "./selfLoop";
import type { OrthogonalConnectorEndpoint } from "./types";
import type { AnchorSpec } from "../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ExtraConnectPoint } from "../../../../objects/registry/ObjectExtraConnectPointsRegistry";

/**
 * Assembles an endpoint descriptor for the orthogonal router. Attaches the outward direction and an AABB to avoid to the resolved coordinate.
 *
 * @param anchor - The endpoint's anchor spec
 * @param point - The resolved endpoint coordinate
 * @param other - The opposite endpoint's coordinate (used for the outward-direction fallback)
 * @param obj - The shape referenced by the endpoint. If a frame shape, compute the AABB to avoid. free endpoints are null/undefined
 * @param extraConnectPoints - The shape's declared extra anchors, so a connector on one of them exits along the declared direction
 * @returns An endpoint bundling coordinate, outward direction, and AABB to avoid (box=null for a free endpoint)
 */
const buildEndpoint = (
	anchor: AnchorSpec,
	point: Point,
	other: Point,
	obj: ObjectState | null | undefined,
	extraConnectPoints: readonly ExtraConnectPoint[] | null | undefined,
): OrthogonalConnectorEndpoint => ({
	point,
	direction: calcEndpointDirection(
		anchor,
		point,
		other,
		obj,
		extraConnectPoints,
	),
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
 * @param sourceExtraConnectPoints - The source shape's declared extra anchors (from ObjectExtraConnectPointsRegistry); omitted = edge anchors only
 * @param targetExtraConnectPoints - The target shape's declared extra anchors; omitted = edge anchors only
 * @returns The orthogonal full path including endpoints `[source, …, target]`
 */
export const resolveOrthogonalRoute = (
	sourceAnchor: AnchorSpec,
	targetAnchor: AnchorSpec,
	sourcePoint: Point,
	targetPoint: Point,
	sourceObj: ObjectState | null | undefined,
	targetObj: ObjectState | null | undefined,
	sourceExtraConnectPoints?: readonly ExtraConnectPoint[] | null,
	targetExtraConnectPoints?: readonly ExtraConnectPoint[] | null,
): Point[] => {
	const source = buildEndpoint(
		sourceAnchor,
		sourcePoint,
		targetPoint,
		sourceObj,
		sourceExtraConnectPoints,
	);
	const target = buildEndpoint(
		targetAnchor,
		targetPoint,
		sourcePoint,
		targetObj,
		targetExtraConnectPoints,
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
