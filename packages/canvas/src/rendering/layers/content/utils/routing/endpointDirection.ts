import type { AnchorSpec } from "@jiscribe/doc/model/objects/types/EndpointRef";
import { isConnectPointId } from "@jiscribe/doc/model/objects/types/EndpointRef";
import {
	isTransformedFrame,
	snapToDirection,
	type OrthogonalDirection,
	type Point,
} from "@jiscribe/geometry";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ExtraConnectPoint } from "../../../../objects/registry/ObjectExtraConnectPointsRegistry";
import {
	calcConnectPointDirection,
	calcEdgeAnchorDirection,
	calcExtraConnectPointDirection,
} from "../../../../objects/utils/calcConnectPoint";

/**
 * Determines an endpoint's outward direction — the direction the line has to leave it in.
 *
 * For connectPoint (edge anchor), the anchor's own outward normal transformed by the shape's
 * rotation and flip. Deriving it from the anchor id rather than "shape center → resolved endpoint"
 * keeps it exact when an anchor region moves the anchor off the bounding-box edge midpoint.
 * An anchor the shape's type declares itself (the brace's `tip`) uses the declared outward vector
 * the same way, and an edge anchor uses its side's normal — the same for every ratio along that
 * side. Cases without an owning shape such as center / free fall back to the direction toward the
 * other point.
 *
 * @param anchor - The endpoint's anchor spec. The kind changes how the outward direction is determined
 * @param point - The resolved endpoint coordinate
 * @param toward - The point the line heads to next (fallback basis when there is no shape info)
 * @param obj - The shape referenced by the endpoint. Used only when connectPoint and a frame shape
 * @param extraConnectPoints - The shape's declared extra anchors (from
 *   ObjectExtraConnectPointsRegistry). Omitted, or an id absent from it, falls back to the
 *   direction toward `toward`
 * @returns The orthogonal direction in which the line exits at that endpoint
 */
export const calcEndpointDirection = (
	anchor: AnchorSpec,
	point: Point,
	toward: Point,
	obj: ObjectState | null | undefined,
	extraConnectPoints?: readonly ExtraConnectPoint[] | null,
): OrthogonalDirection => {
	if (anchor.kind === "edge" && obj && isTransformedFrame(obj)) {
		return calcEdgeAnchorDirection(obj, anchor.side);
	}
	if (anchor.kind === "connectPoint" && obj && isTransformedFrame(obj)) {
		if (isConnectPointId(anchor.id)) {
			return calcConnectPointDirection(obj, anchor.id);
		}
		const declared = extraConnectPoints?.find(
			(candidate) => candidate.id === anchor.id,
		);
		if (declared) {
			return calcExtraConnectPointDirection(obj, declared);
		}
	}
	return snapToDirection(toward.x - point.x, toward.y - point.y);
};
