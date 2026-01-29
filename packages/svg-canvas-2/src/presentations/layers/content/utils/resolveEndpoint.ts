import type { Point } from "@workspace/geometry";

import type { EndpointRef } from "../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";

/**
 * Resolves an EndpointRef to a Point coordinate.
 * Currently supports:
 * - FreeAnchor: Returns the specified point directly
 * - CenterAnchor: Returns the center point (cx, cy) of the referenced object
 *
 * @param endpoint - The endpoint reference to resolve
 * @param objects - Map of all objects in the canvas
 * @returns The resolved point, or null if it cannot be resolved
 */
export const resolveEndpoint = (
	endpoint: EndpointRef,
	objects: Record<string, ObjectState>,
): Point | null => {
	// FreeAnchor: point is directly specified
	if (!endpoint.owner) {
		return endpoint.anchor.point;
	}

	// Get the referenced object
	const obj = objects[endpoint.owner.id];
	if (!obj) {
		return null;
	}

	// CenterAnchor: use the object's center point
	if (endpoint.anchor.kind === "center") {
		// Objects with center points (Rect, Ellipse, etc.) have cx and cy properties
		if ("cx" in obj && "cy" in obj) {
			return { x: obj.cx as number, y: obj.cy as number };
		}
	}

	// ConnectPointAnchor: not yet implemented
	// Will be added in a future update

	return null;
};
