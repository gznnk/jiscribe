import {
	isCenterPoint,
	isTransformedFrame,
	type Point,
	type Rect,
} from "@jiscribe/geometry";

import {
	calcConnectPoint,
	calcEdgeAnchorPoint,
	calcExtraConnectPoint,
} from "./calcConnectPoint";
import type { EndpointRef } from "../../../../schemas/objects/types/EndpointRef";
import { isConnectPointId } from "../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ExtraConnectPoint } from "../../registry/ObjectExtraConnectPointsRegistry";

/**
 * Resolves an EndpointRef to a Point coordinate. It takes a single target
 * object rather than the whole objects map, so memoization keyed only on that
 * shape works.
 *
 * Supported anchor kinds:
 * - free: returns the specified point as-is
 * - center: returns the referenced shape's center point (cx, cy)
 * - connectPoint: returns the specified connection point — one of the four edge
 *   anchors (topCenter / rightCenter / …) or a point the shape's type declares
 *   itself (the brace's `tip`)
 * - edge: returns a free position along one of the shape's local edges, given as
 *   a side and a ratio along it
 *
 * A connectPoint id that is neither builtin nor declared resolves to the shape's
 * center rather than failing, so a doc written against a build where the shape
 * declared more points still draws its connectors.
 *
 * @param endpoint - The endpoint reference to resolve. Carries the anchor kind
 *   (free / center / connectPoint)
 * @param obj - State of the shape the endpoint references. null/undefined when
 *   unreferenced (free) or not found
 * @param outline - The shape's local outline polygon (from ObjectOutlineRegistry).
 *   When present, a connectPoint or edge anchor snaps onto the true edge; omitted =
 *   bounding-box edge (rect/ellipse behavior). Not consulted for extra points
 * @param anchorRegion - The shape's local anchor region (from
 *   ObjectAnchorRegionRegistry). Centers the edge anchors on that band, and
 *   spreads an edge anchor's ratio over it, instead of the bounding box;
 *   omitted = full bounding box
 * @param extraConnectPoints - The shape's declared extra anchors (from
 *   ObjectExtraConnectPointsRegistry), in local coordinates; omitted = the four
 *   edge anchors only
 * @returns The resolved coordinate, or null if it cannot be resolved
 */
export const resolveEndpoint = (
	endpoint: EndpointRef,
	obj: ObjectState | null | undefined,
	outline?: readonly Point[] | null,
	anchorRegion?: Rect | null,
	extraConnectPoints?: readonly ExtraConnectPoint[] | null,
): Point | null => {
	// FreeAnchor: point is directly specified
	if (endpoint.anchor.kind === "free") {
		return endpoint.anchor.point;
	}

	// For owned endpoints, the owner object must be provided
	if (!obj) {
		return null;
	}

	// CenterAnchor: use the object's center point
	if (endpoint.anchor.kind === "center") {
		if (isCenterPoint(obj)) {
			return { x: obj.cx, y: obj.cy };
		}
	}

	// EdgeAnchor: a free position along one of the object's local edges. Only a
	// frame has edges; anything else degrades to the center rather than dropping
	// the connector, the way an undeclared connectPoint id does.
	if (endpoint.anchor.kind === "edge") {
		if (isTransformedFrame(obj)) {
			return calcEdgeAnchorPoint(obj, endpoint.anchor, outline, anchorRegion);
		}
		if (isCenterPoint(obj)) {
			return { x: obj.cx, y: obj.cy };
		}
	}

	// ConnectPointAnchor: a named point on the object — an edge anchor or one the
	// object's type declares. The center is never a connectPoint id (it is its own
	// kind === "center" anchor).
	if (endpoint.anchor.kind === "connectPoint") {
		const anchorId = endpoint.anchor.id;

		// Check if the object has transform properties (Frame-based)
		if (isTransformedFrame(obj)) {
			if (isConnectPointId(anchorId)) {
				return calcConnectPoint(obj, anchorId, outline, anchorRegion);
			}
			const declared = extraConnectPoints?.find(
				(candidate) => candidate.id === anchorId,
			);
			if (declared) {
				return calcExtraConnectPoint(obj, declared);
			}
		}

		// Undeclared id: degrade to the center instead of dropping the connector.
		if (isCenterPoint(obj)) {
			return { x: obj.cx, y: obj.cy };
		}
	}

	return null;
};
