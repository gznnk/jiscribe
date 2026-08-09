import {
	calcOutlinePointTowardForPolygon,
	calcOutlinePointTowardForRotatedEllipse,
	calcOutlinePointTowardForRotatedFrame,
	isTransformedFrame,
	type Point,
	type TransformedEllipse,
} from "@workspace/geometry";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";

/**
 * Snaps a center-anchored endpoint onto a point on the outline of a
 * rect / point / ellipse shape. Call only when the anchor is center. Takes a single
 * target shape rather than the whole objects map so memoization can depend on
 * that shape alone.
 *
 * @param point - The resolved endpoint (usually the shape's center)
 * @param toward - The point used as the direction the line "heads toward" when computing the intersection with the outline
 * @param obj - State of the shape the endpoint references. null/undefined if unreferenced (in which case point is returned as-is)
 * @param outline - The shape's local outline polygon (from ObjectOutlineRegistry).
 *   When present, the endpoint snaps onto that true outline; omitted = rect/point/ellipse handling
 * @returns The point snapped onto the outline. null if there is no intersection, e.g. toward is inside the shape. For shapes with neither an outline nor rect/point/ellipse geometry, the original point without adjustment
 */
export const adjustToOutline = (
	point: Point,
	toward: Point,
	obj: ObjectState | null | undefined,
	outline?: readonly Point[] | null,
): Point | null => {
	if (!obj) {
		return point;
	}

	// Check if object has valid TransformedFrame properties (required for both rect and ellipse)
	if (!isTransformedFrame(obj)) {
		return point;
	}

	// Non-rectangular shapes provide a true outline polygon; snap onto it. The
	// polygon already carries rotation/flip via the object's transform.
	if (outline && outline.length >= 2) {
		return calcOutlinePointTowardForPolygon(outline, obj, toward);
	}

	// The features descriptor is stamped onto the state at construction
	// (ObjectMapperRegistry), so the outline geometry is read from the object
	// directly — no registry lookup.
	// Adjust for objects with rect geometry. `point` shares it: its box is derived
	// from content rather than stored, but the drawn extent is the same rectangle.
	if (obj.features?.geometry === "rect" || obj.features?.geometry === "point") {
		return calcOutlinePointTowardForRotatedFrame(obj, toward);
	}

	// Adjust for objects with ellipse geometry
	// Convert width/height to rx/ry for ellipse calculation
	if (obj.features?.geometry === "ellipse") {
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
