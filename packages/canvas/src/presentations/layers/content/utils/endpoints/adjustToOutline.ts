import {
	calcOutlinePointTowardForPolygon,
	calcOutlinePointTowardForRotatedEllipse,
	calcOutlinePointTowardForRotatedFrame,
	isTransformedFrame,
	type Point,
	type TransformedEllipse,
	type TransformedFrame,
} from "@workspace/geometry";

import type { GeometryType } from "../../../../../schemas/objects/types/GeometryType";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";

/** Snaps onto the outline the shape's box implies, returning null where the line misses it. */
type OutlineSnapper = (frame: TransformedFrame, toward: Point) => Point | null;

const snapToFrameOutline: OutlineSnapper = (frame, toward) =>
	calcOutlinePointTowardForRotatedFrame(frame, toward);

const snapToEllipseOutline: OutlineSnapper = (frame, toward) => {
	const ellipse: TransformedEllipse = {
		cx: frame.cx,
		cy: frame.cy,
		rx: frame.width / 2,
		ry: frame.height / 2,
		rotation: frame.rotation,
		scaleX: frame.scaleX,
		scaleY: frame.scaleY,
	};
	return calcOutlinePointTowardForRotatedEllipse(ellipse, toward);
};

/**
 * The outline each geometry's box implies, one entry per GeometryType so that a
 * geometry added to the union has to declare its own. `null` marks a geometry
 * whose box is no outline to snap to: `none` has no box at all, and `poly` is
 * only ever adjusted through the real polygon its registry supplies.
 * `point` shares the frame calculation — its box is derived from the content
 * rather than stored, but the drawn extent is the same rectangle.
 */
const outlineSnapperByGeometry: Record<GeometryType, OutlineSnapper | null> = {
	none: null,
	rect: snapToFrameOutline,
	ellipse: snapToEllipseOutline,
	poly: null,
	point: snapToFrameOutline,
};

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
	const geometry = obj.features?.geometry;
	const snapToOutline = geometry ? outlineSnapperByGeometry[geometry] : null;
	if (!snapToOutline) {
		return point;
	}

	return snapToOutline(obj, toward);
};
