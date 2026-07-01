import {
	calcOutlinePointTowardForRotatedEllipse,
	calcOutlinePointTowardForRotatedFrame,
	isTransformedFrame,
	type Point,
	type TransformedEllipse,
} from "@workspace/geometry";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { objectMapperRegistry } from "../../../../../states/registry/ObjectMapperRegistry";

/**
 * Snaps a center-anchored endpoint onto a point on the outline of a
 * rect / ellipse shape. Call only when the anchor is center. Takes a single
 * target shape rather than the whole objects map so memoization can depend on
 * that shape alone.
 *
 * @param point - The resolved endpoint (usually the shape's center)
 * @param toward - The point used as the direction the line "heads toward" when computing the intersection with the outline
 * @param obj - State of the shape the endpoint references. null/undefined if unreferenced (in which case point is returned as-is)
 * @returns The point snapped onto the outline (for rect/ellipse shapes). null if there is no intersection, e.g. toward is inside the shape. For shapes other than rect/ellipse, the original point without adjustment
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
