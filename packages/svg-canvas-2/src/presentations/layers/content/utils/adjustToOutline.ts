import {
	calcOutlinePointTowardForRotatedEllipse,
	calcOutlinePointTowardForRotatedFrame,
	isTransformedFrame,
	type Point,
	type TransformedEllipse,
} from "@workspace/geometry";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { objectMapperRegistry } from "../../../../states/objects/ObjectMapperRegistry";

/**
 * Adjusts a center anchor endpoint to the outline point on a rect or ellipse geometry object.
 * Should only be called when the anchor is a center anchor.
 * This version takes a single object instead of the entire objects map for better memoization.
 *
 * @param point - The resolved point (typically the center)
 * @param toward - The point to direct the outline intersection toward
 * @param obj - The object referenced by the endpoint (or null if not found)
 * @returns The adjusted point (outline point for rect/ellipse geometry), null if toward is inside the shape, or original point for non-rect/ellipse
 */
export const adjustToOutline = (
	point: Point,
	toward: Point,
	obj: ObjectState | null | undefined,
): Point | null => {
	if (!obj) {
		return point;
	}

	const features = objectMapperRegistry.getFeatures(obj.type);
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
