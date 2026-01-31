import {
	calcOutlinePointTowardForRotatedEllipse,
	calcOutlinePointTowardForRotatedFrame,
	isTransformedFrame,
	type Point,
	type TransformedEllipse,
} from "@workspace/geometry";

import { objectRegistry } from "../../../../registry/ObjectRegistry";
import type { EndpointRef } from "../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";

/**
 * Adjusts a center anchor endpoint to the outline point on a rect or ellipse geometry object.
 * Should only be called when endpoint.anchor.kind === "center".
 *
 * @param endpoint - The endpoint reference to adjust (must be a center anchor)
 * @param point - The resolved point (typically the center)
 * @param toward - The point to direct the outline intersection toward
 * @param objects - Map of all objects in the canvas
 * @returns The adjusted point (outline point for rect/ellipse geometry, original point otherwise)
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

	const features = objectRegistry.getFeatures(obj.type);
	if (!features) {
		return point;
	}

	// Check if object has valid TransformedFrame properties (required for both rect and ellipse)
	if (!isTransformedFrame(obj)) {
		return point;
	}

	// Adjust for objects with rect geometry
	if (features.geometry === "rect") {
		return calcOutlinePointTowardForRotatedFrame(obj, toward);
	}

	// Adjust for objects with ellipse geometry
	// Convert width/height to rx/ry for ellipse calculation
	if (features.geometry === "ellipse") {
		const ellipse: TransformedEllipse = {
			cx: obj.cx,
			cy: obj.cy,
			rx: obj.width / 2,
			ry: obj.height / 2,
			rotation: obj.rotation,
			scaleX: obj.scaleX,
			scaleY: obj.scaleY,
		};
		return calcOutlinePointTowardForRotatedEllipse(ellipse, toward);
	}

	return point;
};
