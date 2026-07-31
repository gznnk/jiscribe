import {
	isTransformedFrame,
	snapToDirection,
	type OrthogonalDirection,
	type Point,
} from "@workspace/geometry";

import type { AnchorSpec } from "../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { calcConnectPointDirection } from "../../../../objects/utils/calcConnectPoint";

/**
 * Determines an endpoint's outward direction — the direction the line has to leave it in.
 *
 * For connectPoint (edge anchor), the anchor's own outward normal transformed by the shape's
 * rotation and flip. Deriving it from the anchor id rather than "shape center → resolved endpoint"
 * keeps it exact when an anchor region moves the anchor off the bounding-box edge midpoint.
 * Cases without an owning shape such as center / free fall back to the direction toward the other point.
 *
 * @param anchor - The endpoint's anchor spec. The kind changes how the outward direction is determined
 * @param point - The resolved endpoint coordinate
 * @param toward - The point the line heads to next (fallback basis when there is no shape info)
 * @param obj - The shape referenced by the endpoint. Used only when connectPoint and a frame shape
 * @returns The orthogonal direction in which the line exits at that endpoint
 */
export const calcEndpointDirection = (
	anchor: AnchorSpec,
	point: Point,
	toward: Point,
	obj: ObjectState | null | undefined,
): OrthogonalDirection => {
	if (anchor.kind === "connectPoint" && obj && isTransformedFrame(obj)) {
		return calcConnectPointDirection(obj, anchor.id);
	}
	return snapToDirection(toward.x - point.x, toward.y - point.y);
};
