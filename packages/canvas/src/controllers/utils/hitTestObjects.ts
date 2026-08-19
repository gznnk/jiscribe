import {
	calcDistanceToSegment,
	calcInverseAffineTransformedPoint,
	convertRectToBoundingBox,
	degreesToRadians,
	isPointInPolygon,
	isTransformedFrame,
} from "@jiscribe/geometry";
import type {
	BoundingBox,
	Point,
	Rect,
	TransformedFrame,
} from "@jiscribe/geometry";

import { collectConnectorPoints } from "./calcConnectorBoundingBox";
import { calcObjectBoundingBox } from "./calcObjectBoundingBox";
import { sortObjectIdsByZOrder } from "./sortObjectIdsByZOrder";
import type { ObjectAnchorRegionRegistry } from "../../rendering/objects/registry/ObjectAnchorRegionRegistry";
import type { ObjectExtraConnectPointsRegistry } from "../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectOutlineRegistry } from "../../rendering/objects/registry/ObjectOutlineRegistry";
import { isPoly } from "../../schemas/objects/types/Poly";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isConnectorState } from "../../states/objects/connector/ConnectorState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

/** Extra reach (world px) a line-like shape is hit from, beyond half its stroke. */
export const DEFAULT_HIT_TOLERANCE = 4;

/** The registries a hit test resolves drawn silhouettes and connector routes through. */
export type HitTestRegistries = {
	objectOutline: Pick<ObjectOutlineRegistry, "get">;
	objectAnchorRegion: Pick<ObjectAnchorRegionRegistry, "get">;
	objectExtraConnectPoints: Pick<ObjectExtraConnectPointsRegistry, "get">;
};

/** How close (world px) the point must come to a line-like shape to hit it. */
const resolveLineReach = (object: ObjectState, tolerance: number): number => {
	const strokeWidth =
		"strokeWidth" in object && typeof object.strokeWidth === "number"
			? object.strokeWidth
			: 1;
	return tolerance + strokeWidth / 2;
};

/** True when the point comes within `reach` of the path through `points`. */
const isPointNearPath = (
	point: Point,
	points: readonly Point[],
	reach: number,
): boolean => {
	for (let i = 1; i < points.length; i++) {
		if (calcDistanceToSegment(point, points[i - 1], points[i]) <= reach) {
			return true;
		}
	}
	return false;
};

/**
 * Whether the point falls on a frame-based shape, testing the drawn silhouette
 * where the type registers one and the box its geometry implies otherwise —
 * the same two-step the connector endpoint resolver makes (adjustToOutline).
 */
const isPointOnFrame = (
	point: Point,
	object: ObjectState & TransformedFrame,
	registries: HitTestRegistries,
): boolean => {
	// The flips are ±1 and the rotation is always present (TransformedFrame), so
	// the inverse always exists.
	const local = calcInverseAffineTransformedPoint(
		point.x,
		point.y,
		object.scaleX,
		object.scaleY,
		degreesToRadians(object.rotation),
		object.cx,
		object.cy,
	);

	const outline = registries.objectOutline.get(object.type)?.(object);
	if (outline && outline.length >= 3) {
		return isPointInPolygon(local, outline);
	}

	const halfWidth = Math.abs(object.width) / 2;
	const halfHeight = Math.abs(object.height) / 2;
	if (halfWidth === 0 || halfHeight === 0) {
		return false;
	}
	if (object.features?.geometry === "ellipse") {
		const normalizedX = local.x / halfWidth;
		const normalizedY = local.y / halfHeight;
		return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
	}
	return Math.abs(local.x) <= halfWidth && Math.abs(local.y) <= halfHeight;
};

/** Whether the point falls on the object as drawn. Groups are never hit directly. */
const isPointOnObject = (
	point: Point,
	object: ObjectState,
	objects: Record<string, ObjectState>,
	registries: HitTestRegistries,
	tolerance: number,
): boolean => {
	if (isGroupState(object) || object.features?.geometry === "none") {
		return false;
	}

	if (isConnectorState(object)) {
		const path = collectConnectorPoints(
			object,
			objects,
			registries.objectOutline,
			registries.objectAnchorRegion,
			registries.objectExtraConnectPoints,
		);
		return (
			path !== null &&
			isPointNearPath(point, path, resolveLineReach(object, tolerance))
		);
	}

	// Poly before frame: the poly types carry no frame, and a connector (which
	// carries points of its own) is already resolved above.
	if (isPoly(object)) {
		const isClosed = object.features?.fill === true;
		const path = isClosed
			? [...object.points, object.points[0]]
			: object.points;
		return (
			(isClosed && isPointInPolygon(point, object.points)) ||
			isPointNearPath(point, path, resolveLineReach(object, tolerance))
		);
	}

	return isTransformedFrame(object)
		? isPointOnFrame(point, object, registries)
		: false;
};

/** Whether two axis-aligned boxes share any area; touching edges count. */
const doBoxesIntersect = (a: BoundingBox, b: BoundingBox): boolean =>
	a.left <= b.right &&
	b.left <= a.right &&
	a.top <= b.bottom &&
	b.top <= a.bottom;

const isRectTarget = (target: Point | Rect): target is Rect =>
	"width" in target && "height" in target;

/**
 * The objects drawn at a point (or reaching into a rect), front-most first.
 *
 * This is a geometric hit test over the committed state, not a DOM one: it
 * answers for every object in the document, including those the current view
 * has scrolled past or viewport culling has dropped, and it is unaffected by
 * what is stacked on top. Fill is not consulted either — the inside of an
 * unfilled shape is a hit, where a pointer would fall through it.
 *
 * @param target - A world point, or a world rect to collect everything reaching
 *   into it. A rect is matched against bounding boxes rather than silhouettes,
 *   so a rotated or curved shape can be reported for a corner it does not fill
 * @param objects - The object map to search; every entry is tested, group
 *   children included
 * @param rootIds - The canvas's root id list, which decides the z-order the
 *   result is sorted in
 * @param registries - Silhouette and connector-route lookups (see
 *   {@link HitTestRegistries})
 * @param tolerance - How far (world px) beyond its stroke a line-like shape —
 *   a connector, a polyline — still counts as hit. Defaults to
 *   {@link DEFAULT_HIT_TOLERANCE}; ignored by area-bearing shapes
 * @returns Ids front-most first, so `result[0]` is what a click would land on.
 *   Groups are never included; their children are tested individually
 */
export const hitTestObjects = (
	target: Point | Rect,
	objects: Record<string, ObjectState>,
	rootIds: string[],
	registries: HitTestRegistries,
	tolerance: number = DEFAULT_HIT_TOLERANCE,
): string[] => {
	const targetBox = isRectTarget(target)
		? convertRectToBoundingBox(target)
		: null;

	const hitIds: string[] = [];
	for (const object of Object.values(objects)) {
		if (targetBox) {
			if (isGroupState(object)) {
				continue;
			}
			const box = calcObjectBoundingBox(object, objects);
			if (box && doBoxesIntersect(box, targetBox)) {
				hitIds.push(object.id);
			}
			continue;
		}
		if (isPointOnObject(target, object, objects, registries, tolerance)) {
			hitIds.push(object.id);
		}
	}

	return sortObjectIdsByZOrder(hitIds, objects, rootIds).reverse();
};
