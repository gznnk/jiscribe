import {
	calcOutlinePointTowardForRotatedFrame,
	isTransformedFrame,
	type Point,
} from "@workspace/geometry";

import { objectRegistry } from "../../../../registry/ObjectRegistry";
import type { EndpointRef } from "../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";

/**
 * Adjusts a center anchor endpoint to the outline point on a rect geometry object.
 * Should only be called when endpoint.anchor.kind === "center".
 *
 * @param endpoint - The endpoint reference to adjust (must be a center anchor)
 * @param point - The resolved point (typically the center)
 * @param toward - The point to direct the outline intersection toward
 * @param objects - Map of all objects in the canvas
 * @returns The adjusted point (outline point for rect geometry, original point otherwise)
 */
export const adjustToOutline = (
	endpoint: EndpointRef,
	point: Point,
	toward: Point,
	objects: Record<string, ObjectState>,
): Point => {
	if (!endpoint.owner) {
		return point;
	}

	const obj = objects[endpoint.owner.id];
	if (!obj) {
		return point;
	}

	// Only adjust for objects with rect geometry and valid TransformedFrame properties
	const features = objectRegistry.getFeatures(obj.type);
	if (features?.geometry !== "rect" || !isTransformedFrame(obj)) {
		return point;
	}

	return calcOutlinePointTowardForRotatedFrame(obj, toward);
};
