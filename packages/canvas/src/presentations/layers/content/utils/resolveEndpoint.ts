import {
	calcFrameKeyPoints,
	isCenterPoint,
	isTransformedFrame,
	type Point,
} from "@workspace/geometry";

import type { EndpointRef } from "../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";

/**
 * Resolves an EndpointRef to a Point coordinate using a single object instead of the entire objects map.
 * This enables better memoization since only the specific object is a dependency.
 *
 * Supports:
 * - FreeAnchor: Returns the specified point directly
 * - CenterAnchor: Returns the center point (cx, cy) of the referenced object
 * - ConnectPointAnchor: Returns the specified connection point (e.g., topCenter, rightCenter)
 *
 * @param endpoint - The endpoint reference to resolve
 * @param obj - The object referenced by the endpoint (or null if not found)
 * @returns The resolved point, or null if it cannot be resolved
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
			// TODO: キャッシュを使うようにしたい
			// Calculate all key points (corners and edge midpoints)
			const keyPoints = calcFrameKeyPoints({
				cx: obj.cx,
				cy: obj.cy,
				width: obj.width,
				height: obj.height,
				rotation: obj.rotation,
				scaleX: obj.scaleX,
				scaleY: obj.scaleY,
			});

			// Return the specified anchor point
			switch (anchorId) {
				case "topCenter":
					return keyPoints.topCenter;
				case "rightCenter":
					return keyPoints.rightCenter;
				case "bottomCenter":
					return keyPoints.bottomCenter;
				case "leftCenter":
					return keyPoints.leftCenter;
				default:
					// Invalid anchor ID
					return null;
			}
		}
	}

	return null;
};
