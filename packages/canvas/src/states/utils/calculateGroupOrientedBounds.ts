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
 * @returns the Oriented Bounding Box (as a TransformedFrame), or null if there are no children
 */
export function calculateGroupOrientedBounds(
	objects: Record<string, ObjectState>,
	groupId: string,
): TransformedFrame | null {
	const group = objects[groupId];
	if (!group || group.type !== "group") {
		return null;
	}

	const groupState = group as GroupState;

	// Collect all points of the children (recursively expanding nested groups)
	const allPoints = collectChildPoints(objects, groupState.childIds);

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
): Point[] {
	const points: Point[] = [];

	for (const childId of childIds) {
		const child = objects[childId];
		if (!child) {
			continue;
		}

		if (child.type === "group") {
			// For a group, recursively collect its children
			const nestedGroup = child as GroupState;
			points.push(...collectChildPoints(objects, nestedGroup.childIds));
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
