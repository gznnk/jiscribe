import {
	calcFrameKeyPoint,
	calcOutlinePointTowardForPolygon,
	isCenterPoint,
	isTransformedFrame,
	type Point,
} from "@workspace/geometry";

import type { EndpointRef } from "../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";

/**
 * Resolves an EndpointRef to a Point coordinate. It takes a single target
 * object rather than the whole objects map, so memoization keyed only on that
 * shape works.
 *
 * Supported anchor kinds:
 * - free: returns the specified point as-is
 * - center: returns the referenced shape's center point (cx, cy)
 * - connectPoint: returns the specified connection point (an edge midpoint such
 *   as topCenter / rightCenter)
 *
 * @param endpoint - The endpoint reference to resolve. Carries the anchor kind
 *   (free / center / connectPoint)
 * @param obj - State of the shape the endpoint references. null/undefined when
 *   unreferenced (free) or not found
 * @param outline - The shape's local outline polygon (from ShapeOutlineRegistry).
 *   When present, a connectPoint anchor snaps onto the true edge; omitted =
 *   bounding-box edge midpoint (rect/ellipse behavior)
 * @returns The resolved coordinate, or null if it cannot be resolved
 */
export const resolveEndpoint = (
	endpoint: EndpointRef,
	obj: ObjectState | null | undefined,
	outline?: readonly Point[] | null,
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
			// Compute only the requested edge key point (avoids calculating all 8).
			// The center is never a connectPoint id (it is its own kind === "center"
			// anchor); an unknown id falls through to null.
			switch (anchorId) {
				case "topCenter":
				case "rightCenter":
				case "bottomCenter":
				case "leftCenter": {
					// The bounding-box edge midpoint doubles as the outward direction
					// (center → midpoint) for outline shapes; casting that ray onto the
					// true outline lands the anchor on the drawn edge. Rect/ellipse have
					// no outline registered, so they keep the midpoint as-is.
					const boxEdgeMidpoint = calcFrameKeyPoint(obj, anchorId);
					if (outline && outline.length >= 2) {
						return (
							calcOutlinePointTowardForPolygon(outline, obj, boxEdgeMidpoint) ??
							boxEdgeMidpoint
						);
					}
					return boxEdgeMidpoint;
				}
				default:
					return null;
			}
		}
	}

	return null;
};
