import {
	calcKeyPointsBoundingBox,
	unionBoundingBoxes,
} from "@jiscribe/geometry";
import type { BoundingBox, FrameKeyPoints } from "@jiscribe/geometry";

import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isConnectorState } from "../../states/objects/connector/ConnectorState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * Builds a flat "object ID → root-level bounding box" map in a single bottom-up pass.
 *
 * This is the marquee / multi-select equivalent of calling {@link calcObjectBoundingBox}
 * on every object, but computed once with memoization instead of per drag frame:
 * - Leaf shapes (Frame / Poly) derive their bbox from the precomputed `keyPoints`
 *   (`calcKeyPointsBoundingBox` over the four corners is exactly `calcBoundingBox` /
 *   `calcPolyBoundingBox`, so results are identical to `calcObjectBoundingBox`).
 * - Groups union their children's bboxes; each object is resolved at most once, so a
 *   leaf at depth D is computed once rather than the D+1 times the naive traversal did.
 * - Connectors are excluded (marquee selects shapes only, matching the old
 *   `collectIdsInArea`). They are never group children either, so they never leak into
 *   a group's bbox.
 *
 * Objects without a valid extent (empty poly, unknown kind, group with no valid
 * children, connector) are simply absent from the returned map.
 *
 * @param objects - The object map (group structure + kind dispatch)
 * @param keyPoints - Precomputed keyPoints for frames and non-connector polys (from DragStartSnapshot)
 * @returns id → bounding box for every object with a valid extent
 */
export function buildObjectBBoxes(
	objects: Record<string, ObjectState>,
	keyPoints: Record<string, FrameKeyPoints>,
): Record<string, BoundingBox> {
	const bboxes: Record<string, BoundingBox> = {};

	const resolve = (id: string): BoundingBox | null => {
		const memoized = bboxes[id];
		if (memoized) {
			return memoized;
		}

		const obj = objects[id];
		// Connectors follow their endpoints; marquee selects shapes only, and they are
		// never group children, so they are excluded from the map entirely.
		if (!obj || isConnectorState(obj)) {
			return null;
		}

		let bbox: BoundingBox | null;
		if (isGroupState(obj)) {
			// A group's own frame keyPoints are ignored; its extent is the union of its
			// children, matching calcObjectBoundingBox's dispatch order (group before frame).
			bbox = unionBoundingBoxes(
				obj.childIds.map((childId) => resolve(childId)),
			);
		} else {
			const keyPointsForObject = keyPoints[id];
			bbox = keyPointsForObject
				? calcKeyPointsBoundingBox(keyPointsForObject)
				: null;
		}

		if (bbox) {
			bboxes[id] = bbox;
		}
		return bbox;
	};

	for (const id of Object.keys(objects)) {
		resolve(id);
	}

	return bboxes;
}

/**
 * Unions the bounding boxes of the given IDs, using precomputed per-object bboxes.
 *
 * IDs without an entry are skipped. Returns null when no ID resolves to a valid extent.
 * Used for the transient multi-select group bounds during a marquee drag.
 *
 * @param ids - IDs to union
 * @param bboxes - Map of object ID → bounding box, as {@link buildObjectBBoxes} builds it
 */
export function calcUnionBoundingBox(
	ids: Iterable<string>,
	bboxes: Record<string, BoundingBox>,
): BoundingBox | null {
	return unionBoundingBoxes(Array.from(ids, (id) => bboxes[id]));
}
