import { isPoly } from "@jiscribe/doc/model/objects/types/Poly";
import {
	calcFrameCornerPoints,
	calcOrientedFrameFromPoints,
	isTransformedFrame,
} from "@jiscribe/geometry";
import type { Point, Transform, TransformedFrame } from "@jiscribe/geometry";

import { MIN_GROUP_DIMENSION } from "../../constants/groupDimensions";
import type { ObjectState } from "../objects/base/ObjectState";
import type { GroupState } from "../objects/primitives/group/GroupState";

/**
 * Computes an Oriented Bounding Box (OBB) that contains all of a group's children.
 *
 * Returns an oriented bounding box that accounts for the group's rotation.
 * Children are defined in the global coordinate system; the group's transform is display-only.
 *
 * @param objects - the object map
 * @param groupId - the group's ID
 * @param pointCache - optional group-ID → collected-points memo, shared across a
 *   single bottom-up pass (e.g. `canvasToState`). When provided, a nested group's
 *   already-collected points are reused instead of re-traversing its subtree,
 *   turning the whole-document pass from O(N × depth) into O(N). The point set is
 *   identical either way, so the resulting OBB is unchanged. Omit it for one-off
 *   recomputations where child points may have changed.
 * @returns the Oriented Bounding Box (as a TransformedFrame), or null if there are no children
 */
export function calculateGroupOrientedBounds(
	objects: Record<string, ObjectState>,
	groupId: string,
	pointCache?: Map<string, Point[]>,
): TransformedFrame | null {
	const group = objects[groupId];
	if (!group || group.type !== "group") {
		return null;
	}

	const groupState = group as GroupState;

	// Collect all points of the children (recursively expanding nested groups)
	const allPoints = collectChildPoints(
		objects,
		groupState.childIds,
		pointCache,
	);

	// Record this group's points so an ancestor group can reuse them without
	// re-traversing the subtree. Cache even when empty: an empty group still
	// counts as a (zero-point) child of its parent.
	pointCache?.set(groupId, allPoints);

	// Compute the OBB with the group's transform
	return calcClampedOrientedBounds(allPoints, {
		rotation: groupState.rotation ?? 0,
		scaleX: groupState.scaleX ?? 1,
		scaleY: groupState.scaleY ?? 1,
	});
}

/**
 * Computes an Oriented Bounding Box (OBB) directly from child IDs and a transform,
 * without requiring a group object in the map.
 *
 * Use this when the group does not exist yet (e.g. GroupCommand computing the
 * bounds of a group it is about to create) — it avoids injecting a placeholder
 * group with fake frame values into the object map.
 *
 * @param objects - the object map (children are resolved from here)
 * @param childIds - IDs of the children to enclose
 * @param transform - the transform the resulting OBB should carry
 * @returns the Oriented Bounding Box (as a TransformedFrame), or null if no child contributes geometry
 */
export function calculateOrientedBoundsFromChildIds(
	objects: Record<string, ObjectState>,
	childIds: string[],
	transform: Transform,
): TransformedFrame | null {
	return calcClampedOrientedBounds(
		collectChildPoints(objects, childIds),
		transform,
	);
}

/**
 * Computes the OBB of a point set with the given transform, clamped to the
 * GroupState minimum dimensions.
 */
function calcClampedOrientedBounds(
	points: Point[],
	transform: Transform,
): TransformedFrame | null {
	if (points.length === 0) {
		return null;
	}

	const obb = calcOrientedFrameFromPoints(
		points,
		transform.scaleX,
		transform.scaleY,
		transform.rotation,
	);
	if (!obb) {
		return null;
	}

	// GroupState invariant: width/height must never be 0 (they are divisors in
	// transformFrameByGroup). Collinear children (e.g. two horizontal polylines
	// on the same y) produce a degenerate axis, so clamp it to the minimum.
	// The center stays put; the box just grows symmetrically on that axis.
	return {
		...obb,
		width: Math.max(obb.width, MIN_GROUP_DIMENSION),
		height: Math.max(obb.height, MIN_GROUP_DIMENSION),
	};
}

/**
 * Recursively collects all points of the children.
 * Frame-based shapes contribute corner points; Poly-based shapes contribute vertices.
 */
function collectChildPoints(
	objects: Record<string, ObjectState>,
	childIds: string[],
	pointCache?: Map<string, Point[]>,
): Point[] {
	const points: Point[] = [];

	for (const childId of childIds) {
		const child = objects[childId];
		if (!child) {
			continue;
		}

		if (child.type === "group") {
			// For a group, reuse its already-collected points when memoized
			// (bottom-up order guarantees the child is cached before its parent);
			// otherwise recurse into its subtree.
			const nestedGroup = child as GroupState;
			const cached = pointCache?.get(nestedGroup.id);
			if (cached) {
				points.push(...cached);
			} else {
				points.push(
					...collectChildPoints(objects, nestedGroup.childIds, pointCache),
				);
			}
		} else if (isTransformedFrame(child)) {
			// For objects with a TransformedFrame, add their corner points
			points.push(...calcFrameCornerPoints(child));
		} else if (isPoly(child)) {
			// For Poly-based shapes, add the points array directly
			points.push(...child.points);
		}
	}

	return points;
}
