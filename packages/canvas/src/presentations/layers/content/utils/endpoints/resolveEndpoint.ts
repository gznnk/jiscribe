import {
	isCenterPoint,
	isTransformedFrame,
	type Point,
	type Rect,
} from "@workspace/geometry";

import type { EndpointRef } from "../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { calcConnectPoint } from "../../../../objects/utils/calcConnectPoint";

/**
 * Resolves an EndpointRef to a Point coordinate. It takes a single target
 * object rather than the whole objects map, so memoization keyed only on that
 * shape works.
 *
 * Supported anchor kinds:
 * - free: returns the specified point as-is
 * - center: returns the referenced shape's center point (cx, cy)
 * - connectPoint: returns the specified connection point (an edge anchor such
 *   as topCenter / rightCenter)
 *
 * @param endpoint - The endpoint reference to resolve. Carries the anchor kind
 *   (free / center / connectPoint)
 * @param obj - State of the shape the endpoint references. null/undefined when
 *   unreferenced (free) or not found
 * @param outline - The shape's local outline polygon (from ObjectOutlineRegistry).
 *   When present, a connectPoint anchor snaps onto the true edge; omitted =
 *   bounding-box edge (rect/ellipse behavior)
 * @param anchorRegion - The shape's local anchor region (from
 *   ObjectAnchorRegionRegistry). Centers the edge anchors on that band instead
 *   of the bounding box; omitted = full bounding box
 * @returns The resolved coordinate, or null if it cannot be resolved
 */
export const resolveEndpoint = (
	endpoint: EndpointRef,
	obj: ObjectState | null | undefined,
	outline?: readonly Point[] | null,
	anchorRegion?: Rect | null,
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

	// ConnectPointAnchor: use a specific connection point on the object's edge
	if (endpoint.anchor.kind === "connectPoint") {
		const anchorId = endpoint.anchor.id;

		// Check if the object has transform properties (Frame-based)
		if (isTransformedFrame(obj)) {
			// The center is never a connectPoint id (it is its own kind === "center"
			// anchor); an unknown id falls through to null.
			switch (anchorId) {
				case "topCenter":
				case "rightCenter":
				case "bottomCenter":
				case "leftCenter":
					return calcConnectPoint(obj, anchorId, outline, anchorRegion);
				default:
					return null;
			}
		}
	}

	return null;
};
