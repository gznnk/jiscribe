import type { BoundingBox, Point } from "@jiscribe/geometry";

import {
	calcConnectorExtentBound,
	calcConnectorPathBoundingBox,
} from "./calcConnectorBoundingBox";
import { calcObjectBoundingBox } from "./calcObjectBoundingBox";
import type { VisualExtentRegistries } from "./VisualExtentRegistries";
import {
	listConnectorPathPoints,
	resolveConnectorPointsCached,
	resolveEndpointOwner,
} from "../../connectors/endpoints";
import { isConnectorShiftedWithOwners } from "../../rendering/layers/content/MovePreview";
import type { MovePreview } from "../../rendering/layers/content/MovePreview";
import type { Viewport } from "../../rendering/Viewport";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import {
	isConnectorState,
	type ConnectorState,
} from "../../states/objects/connector/ConnectorState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

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
 * a style-only edit of an owner, and not once one moves. A connector's owners
 * are its drag-start ones while a move drag draws it shifted (MovePreview), and
 * its box is then the start path's, shifted by the drag's delta when compared.
 */
type VisibilityCacheEntry = {
	obj: ObjectState;
	/** The path a connector was boxed from; null for any other object, and for a connector whose `bbox` is a bound. */
	resolved: ReturnType<typeof resolveConnectorPointsCached>;
	/** A connector's endpoint owners when it was boxed; null for any other object. */
	sourceOwner: ObjectState | null;
	/** See `sourceOwner`. */
	targetOwner: ObjectState | null;
	bbox: BoundingBox | null;
	/**
	 * Whether `bbox` is only a connector's conservative bound
	 * (calcConnectorExtentBound), taken because it lay off screen: enough to
	 * keep the connector culled, never to show it, which takes routing it.
	 */
	isBound: boolean;
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
	 * The canvas's registries, fixed for its lifetime, which is what keeps the
	 * cache above valid across calls. The visual bounds keep a shape mounted while
	 * only what it draws outside its geometry box is on screen; a connector's path
	 * is resolved through the geometry registries and the cache the connector
	 * renderer reads too (resolveConnectorPointsCached), so a moved owner routes
	 * each connector once per render rather than once here and again to draw it.
	 */
	registries: VisualExtentRegistries;
	/**
	 * The move drag under way, if any. A connector it draws shifted
	 * (isConnectorShiftedWithOwners) is judged by its drag-start path moved by
	 * the delta, which is routed once for the whole drag rather than per frame.
	 */
	movePreview?: MovePreview;
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
 * - A connector is first bounded without routing it (calcConnectorExtentBound),
 *   and routed for its exact box only when that bound reaches the screen
 */
export function calcVisibleObjectIds({
	objects,
	rootIds,
	viewport,
	textEditObjectId,
	prevCache,
	registries,
	movePreview,
}: CalcVisibleObjectIdsParams): CalcVisibleObjectIdsResult {
	const { minX, minY, width, height, zoom } = viewport;
	const visibleLeft = minX - VIEWPORT_CULL_MARGIN;
	const visibleTop = minY - VIEWPORT_CULL_MARGIN;
	const visibleRight = minX + width / zoom + VIEWPORT_CULL_MARGIN;
	const visibleBottom = minY + height / zoom + VIEWPORT_CULL_MARGIN;

	const visibleIds = new Set<string>();
	const bboxCache: VisibilityBBoxCache = new Map();

	const isOnScreen = (bbox: BoundingBox, shift: Point | null): boolean => {
		const shiftX = shift?.x ?? 0;
		const shiftY = shift?.y ?? 0;
		return (
			bbox.left + shiftX <= visibleRight &&
			bbox.right + shiftX >= visibleLeft &&
			bbox.top + shiftY <= visibleBottom &&
			bbox.bottom + shiftY >= visibleTop
		);
	};

	/**
	 * A connector's box among `ownerObjects`, before `shift`: a bound when that
	 * is enough to tell it is off screen, otherwise the box of its routed path.
	 */
	const resolveConnectorBBox = (
		id: string,
		connector: ConnectorState,
		ownerObjects: Record<string, ObjectState>,
		shift: Point | null,
	): BoundingBox | null => {
		const prevEntry = prevCache?.get(id);
		const sourceOwner = resolveEndpointOwner(ownerObjects, connector.source);
		const targetOwner = resolveEndpointOwner(ownerObjects, connector.target);
		// Identity first: a pan, or a frame that touched other objects, leaves most
		// connectors and their owners as they were, and comparing owner geometry
		// for each of them would cost more than the reuse saves.
		const isSameInputs =
			prevEntry !== undefined &&
			prevEntry.obj === connector &&
			prevEntry.sourceOwner === sourceOwner &&
			prevEntry.targetOwner === targetOwner;
		if (
			isSameInputs &&
			(!prevEntry.isBound ||
				!prevEntry.bbox ||
				!isOnScreen(prevEntry.bbox, shift))
		) {
			bboxCache.set(id, prevEntry);
			return prevEntry.bbox;
		}
		if (!isSameInputs) {
			const bound = calcConnectorExtentBound(
				connector,
				sourceOwner,
				targetOwner,
				registries,
			);
			if (bound && !isOnScreen(bound, shift)) {
				bboxCache.set(id, {
					obj: connector,
					resolved: null,
					sourceOwner,
					targetOwner,
					bbox: bound,
					isBound: true,
				});
				return bound;
			}
		}
		const resolved = resolveConnectorPointsCached(
			connector,
			sourceOwner,
			targetOwner,
			registries.objectOutline,
			registries.objectAnchorRegion,
			registries.objectExtraConnectPoints,
			registries.objectGeometryKey,
		);
		if (
			prevEntry &&
			!prevEntry.isBound &&
			prevEntry.obj === connector &&
			prevEntry.resolved === resolved
		) {
			bboxCache.set(id, { ...prevEntry, sourceOwner, targetOwner });
			return prevEntry.bbox;
		}
		const bbox = resolved
			? calcConnectorPathBoundingBox(
					connector,
					listConnectorPathPoints(resolved),
				)
			: null;
		bboxCache.set(id, {
			obj: connector,
			resolved,
			sourceOwner,
			targetOwner,
			bbox,
			isBound: false,
		});
		return bbox;
	};

	const resolveObjectBBox = (
		id: string,
		obj: ObjectState,
	): BoundingBox | null => {
		const prevEntry = prevCache?.get(id);
		if (prevEntry && prevEntry.obj === obj) {
			bboxCache.set(id, prevEntry);
			return prevEntry.bbox;
		}
		const bbox = calcObjectBoundingBox(obj, objects, registries);
		bboxCache.set(id, {
			obj,
			resolved: null,
			sourceOwner: null,
			targetOwner: null,
			bbox,
			isBound: false,
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

		let bbox: BoundingBox | null;
		let shift: Point | null = null;
		if (isConnectorState(obj)) {
			// Drawn from its owners' start states, shifted with them (see ObjectsRenderer).
			const isShifted =
				movePreview !== undefined &&
				isConnectorShiftedWithOwners(obj, movePreview, objects);
			shift = isShifted ? movePreview.delta : null;
			bbox = resolveConnectorBBox(
				id,
				obj,
				isShifted ? movePreview.startObjects : objects,
				shift,
			);
		} else {
			bbox = resolveObjectBBox(id, obj);
		}
		const isVisible =
			id === textEditObjectId || !bbox || isOnScreen(bbox, shift);
		if (isVisible) {
			visibleIds.add(id);
		}
		return isVisible;
	};

	rootIds.forEach(visit);

	return { visibleIds, bboxCache };
}
