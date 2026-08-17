import type { BoundingBox } from "@jiscribe/geometry";

import { calcConnectorBoundingBox } from "./calcConnectorBoundingBox";
import { calcObjectBoundingBox } from "./calcObjectBoundingBox";
import { resolveEndpointOwner } from "../../presentations/layers/content/utils/endpoints";
import type { ObjectVisualBoundsRegistry } from "../../presentations/objects/registry/ObjectVisualBoundsRegistry";
import type { Viewport } from "../../states/canvas/Viewport";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isConnectorState } from "../../states/objects/connector/ConnectorState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * Margin (world px) added around the visible rect. Absorbs extents the bbox
 * does not account for (stroke widths, arrow heads, text overflowing its
 * frame), so objects straddling the viewport edge never pop in late.
 */
export const VIEWPORT_CULL_MARGIN = 100;

/**
 * Cached inputs and result of one object's bbox computation. An entry is
 * reusable only while every input identity is unchanged: the object itself,
 * and for connectors also both endpoint owners (a connector's geometry
 * follows its owners, so a moved owner must invalidate the connector's bbox).
 */
type VisibilityCacheEntry = {
	obj: ObjectState;
	sourceOwner: ObjectState | null;
	targetOwner: ObjectState | null;
	bbox: BoundingBox | null;
};

/** Object ID → cached bbox entry, carried across renders for diff reuse. */
export type VisibilityBBoxCache = Map<string, VisibilityCacheEntry>;

type CalcVisibleObjectIdsParams = {
	objects: Record<string, ObjectState>;
	rootIds: string[];
	viewport: Viewport;
	/** Always kept visible so an in-progress text edit never unmounts its object. */
	textEditObjectId?: string | null;
	/** Previous render's cache; unchanged objects reuse their bbox from it. */
	prevCache?: VisibilityBBoxCache;
	/**
	 * Per-canvas ObjectVisualBoundsRegistry, so a shape stays mounted while only
	 * what it draws outside its geometry box is on screen. Fixed for a canvas's
	 * lifetime, which is what keeps the cache above valid across calls.
	 */
	visualBounds?: Pick<ObjectVisualBoundsRegistry, "get"> | null;
};

type CalcVisibleObjectIdsResult = {
	/** IDs to render: visible leaves/connectors plus groups with a visible descendant. */
	visibleIds: Set<string>;
	/** Cache to carry into the next call as `prevCache`. */
	bboxCache: VisibilityBBoxCache;
};

/**
 * Computes the set of object IDs whose bbox intersects the visible world rect
 * (viewport + margin), for viewport culling in ObjectsRenderer (issue #212).
 *
 * - Connectors are judged by their own bbox, not their endpoint owners
 *   (a connector can cross the screen while both owners are offscreen)
 * - Groups are never pruned as a whole: children are judged individually and
 *   the group is included when any descendant is (children can extend outside
 *   the group frame)
 * - Objects without a computable bbox are conservatively included
 */
export function calcVisibleObjectIds({
	objects,
	rootIds,
	viewport,
	textEditObjectId,
	prevCache,
	visualBounds,
}: CalcVisibleObjectIdsParams): CalcVisibleObjectIdsResult {
	const { minX, minY, width, height, zoom } = viewport;
	const visibleLeft = minX - VIEWPORT_CULL_MARGIN;
	const visibleTop = minY - VIEWPORT_CULL_MARGIN;
	const visibleRight = minX + width / zoom + VIEWPORT_CULL_MARGIN;
	const visibleBottom = minY + height / zoom + VIEWPORT_CULL_MARGIN;

	const visibleIds = new Set<string>();
	const bboxCache: VisibilityBBoxCache = new Map();

	const resolveBBox = (id: string, obj: ObjectState): BoundingBox | null => {
		if (isConnectorState(obj)) {
			const sourceOwner = resolveEndpointOwner(objects, obj.source);
			const targetOwner = resolveEndpointOwner(objects, obj.target);
			const prevEntry = prevCache?.get(id);
			if (
				prevEntry &&
				prevEntry.obj === obj &&
				prevEntry.sourceOwner === sourceOwner &&
				prevEntry.targetOwner === targetOwner
			) {
				bboxCache.set(id, prevEntry);
				return prevEntry.bbox;
			}
			const bbox = calcConnectorBoundingBox(obj, objects);
			bboxCache.set(id, { obj, sourceOwner, targetOwner, bbox });
			return bbox;
		}

		const prevEntry = prevCache?.get(id);
		if (prevEntry && prevEntry.obj === obj) {
			bboxCache.set(id, prevEntry);
			return prevEntry.bbox;
		}
		const bbox = calcObjectBoundingBox(obj, objects, visualBounds);
		bboxCache.set(id, { obj, sourceOwner: null, targetOwner: null, bbox });
		return bbox;
	};

	const visit = (id: string): boolean => {
		const obj = objects[id];
		if (!obj) {
			return false;
		}

		if (isGroupState(obj)) {
			let hasVisibleChild = false;
			for (const childId of obj.childIds) {
				hasVisibleChild = visit(childId) || hasVisibleChild;
			}
			if (hasVisibleChild) {
				visibleIds.add(id);
			}
			return hasVisibleChild;
		}

		const bbox = resolveBBox(id, obj);
		const isVisible =
			id === textEditObjectId ||
			!bbox ||
			(bbox.left <= visibleRight &&
				bbox.right >= visibleLeft &&
				bbox.top <= visibleBottom &&
				bbox.bottom >= visibleTop);
		if (isVisible) {
			visibleIds.add(id);
		}
		return isVisible;
	};

	rootIds.forEach(visit);

	return { visibleIds, bboxCache };
}
