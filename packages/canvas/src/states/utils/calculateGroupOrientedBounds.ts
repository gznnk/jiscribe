import {
	calcFrameCornerPoints,
	calcOrientedFrameFromPoints,
	isTransformedFrame,
} from "@workspace/geometry";
import type { Point, TransformedFrame } from "@workspace/geometry";

import { isPoly } from "../../schemas/objects/types/Poly";
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

	if (allPoints.length === 0) {
		return null;
	}

	// Get the group's transform
	const groupRotation = groupState.rotation ?? 0;
	const groupScaleX = groupState.scaleX ?? 1;
	const groupScaleY = groupState.scaleY ?? 1;

	// Compute an Oriented Bounding Box with the group's transform from the point set
	return calcOrientedFrameFromPoints(
		allPoints,
		groupScaleX,
		groupScaleY,
		groupRotation,
	);
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
