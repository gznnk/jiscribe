import {
	calcFrameKeyPoint,
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
 * @returns The resolved coordinate, or null if it cannot be resolved
 */
export const resolveEndpoint = (
	endpoint: EndpointRef,
	obj: ObjectState | null | undefined,
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
			// "center" or an invalid id falls through to null (a center anchor is handled by the kind === "center" path)
			switch (anchorId) {
				case "topCenter":
				case "rightCenter":
				case "bottomCenter":
				case "leftCenter":
					return calcFrameKeyPoint(obj, anchorId);
				default:
					return null;
			}
		}
	}

	return null;
};
