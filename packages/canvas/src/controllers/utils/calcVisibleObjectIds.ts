import type { BoundingBox } from "@jiscribe/geometry";

import { calcConnectorPathBoundingBox } from "./calcConnectorBoundingBox";
import { calcObjectBoundingBox } from "./calcObjectBoundingBox";
import {
	listConnectorPathPoints,
	resolveConnectorPointsCached,
	resolveEndpointOwner,
} from "../../connectors/endpoints";
import type { ObjectGeometryKeyRegistry } from "../../rendering/objects/registry/ObjectGeometryKeyRegistry";
import type { Viewport } from "../../rendering/Viewport";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isConnectorState } from "../../states/objects/connector/ConnectorState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";
import type { ICanvasRegistries } from "../registries/ICanvasRegistries";

/**
 * Margin (world px) added around the visible rect. Absorbs extents the bbox
 * does not account for (stroke widths, arrow heads, text overflowing its
 * frame), so objects straddling the viewport edge never pop in late.
 */
export const VIEWPORT_CULL_MARGIN = 100;

/**
 * Cached inputs and result of one object's bbox computation. An entry is
 * reusable only while the object itself is unchanged, and for a connector also
 * the path it was boxed from: a connector's geometry follows its owners, so the
 * box stands while its owners are the same objects, or failing that while
 * resolveConnectorPointsCached hands back the same path — which it does through
 * a style-only edit of an owner, and not once one moves.
 */
type VisibilityCacheEntry = {
	obj: ObjectState;
	/** The path a connector was boxed from; null for any other object. */
	resolved: ReturnType<typeof resolveConnectorPointsCached>;
	/** A connector's endpoint owners when it was boxed; null for any other object. */
	sourceOwner: ObjectState | null;
	targetOwner: ObjectState | null;
	bbox: BoundingBox | null;
};

/** Object ID → cached bbox entry, carried across renders for diff reuse. */
export type VisibilityBBoxCache = Map<string, VisibilityCacheEntry>;

/** The registries viewport culling reads. */
export type CullingRegistries = Pick<
	ICanvasRegistries,
	| "objectVisualBounds"
	| "objectOutline"
	| "objectAnchorRegion"
	| "objectExtraConnectPoints"
> & {
	/** Read for the owners' state beyond their frame (resolveConnectorPointsCached). */
	objectGeometryKey: ObjectGeometryKeyRegistry;
};

type CalcVisibleObjectIdsParams = {
	objects: Record<string, ObjectState>;
	rootIds: string[];
	viewport: Viewport;
	/** Always kept visible so an in-progress text edit never unmounts its object. */
	textEditObjectId?: string | null;
	/** Previous render's cache; unchanged objects reuse their bbox from it. */
	prevCache?: VisibilityBBoxCache;
	/**
	 * The canvas's registries, fixed for its lifetime, which is what keeps the
	 * cache above valid across calls. The visual bounds keep a shape mounted while
	 * only what it draws outside its geometry box is on screen; a connector's path
	 * is resolved through the geometry registries and the cache the connector
	 * renderer reads too (resolveConnectorPointsCached), so a moved owner routes
	 * each connector once per render rather than once here and again to draw it.
	 */
	registries: CullingRegistries;
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
	registries,
}: CalcVisibleObjectIdsParams): CalcVisibleObjectIdsResult {
	const { minX, minY, width, height, zoom } = viewport;
	const visibleLeft = minX - VIEWPORT_CULL_MARGIN;
	const visibleTop = minY - VIEWPORT_CULL_MARGIN;
	const visibleRight = minX + width / zoom + VIEWPORT_CULL_MARGIN;
	const visibleBottom = minY + height / zoom + VIEWPORT_CULL_MARGIN;

	const visibleIds = new Set<string>();
	const bboxCache: VisibilityBBoxCache = new Map();

	const resolveBBox = (id: string, obj: ObjectState): BoundingBox | null => {
		const prevEntry = prevCache?.get(id);
		if (isConnectorState(obj)) {
			const sourceOwner = resolveEndpointOwner(objects, obj.source);
			const targetOwner = resolveEndpointOwner(objects, obj.target);
			// Identity first: a pan, or a frame that touched other objects, leaves most
			// connectors and their owners as they were, and comparing owner geometry
			// for each of them would cost more than the reuse saves.
			if (
				prevEntry &&
				prevEntry.obj === obj &&
				prevEntry.sourceOwner === sourceOwner &&
				prevEntry.targetOwner === targetOwner
			) {
				bboxCache.set(id, prevEntry);
				return prevEntry.bbox;
			}
			const resolved = resolveConnectorPointsCached(
				obj,
				sourceOwner,
				targetOwner,
				registries.objectOutline,
				registries.objectAnchorRegion,
				registries.objectExtraConnectPoints,
				registries.objectGeometryKey,
			);
			if (
				prevEntry &&
				prevEntry.obj === obj &&
				prevEntry.resolved === resolved
			) {
				bboxCache.set(id, { ...prevEntry, sourceOwner, targetOwner });
				return prevEntry.bbox;
			}
			const bbox = resolved
				? calcConnectorPathBoundingBox(obj, listConnectorPathPoints(resolved))
				: null;
			bboxCache.set(id, { obj, resolved, sourceOwner, targetOwner, bbox });
			return bbox;
		}

		if (prevEntry && prevEntry.obj === obj) {
			bboxCache.set(id, prevEntry);
			return prevEntry.bbox;
		}
		const bbox = calcObjectBoundingBox(
			obj,
			objects,
			registries.objectVisualBounds,
		);
		bboxCache.set(id, {
			obj,
			resolved: null,
			sourceOwner: null,
			targetOwner: null,
			bbox,
		});
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
