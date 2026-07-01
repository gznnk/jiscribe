import {
	calcBoundingBox,
	calcPolyBoundingBox,
	isTransformedFrame,
	type BoundingBox,
} from "@workspace/geometry";

import { isPoly } from "../../schemas/objects/types/Poly";
import {
	isGroupState,
	type GroupState,
} from "../../states/objects/primitives/group/GroupState";

/**
 * Recursively traverses a group's children to compute its bounding box.
 *
 * @param group - The group whose bounding box is computed
 * @param objects - The object map
 * @returns The bounding box, or null if there are no valid children
 */
export function calcGroupBoundingBox(
	group: GroupState,
	objects: Record<string, unknown>,
): BoundingBox | null {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	let hasValidChild = false;

	for (const childId of group.childIds) {
		const child = objects[childId];
		if (!child) {
			continue;
		}

		let bbox;
		if (isTransformedFrame(child)) {
			bbox = calcBoundingBox(child);
		} else if (isGroupState(child)) {
			bbox = calcGroupBoundingBox(child, objects);
			if (!bbox) {
				continue;
			}
		} else if (isPoly(child)) {
			// For Poly types (Polyline, Polygon), compute the bounding box from the points array
			bbox = calcPolyBoundingBox(child.points);
			if (!bbox) {
				continue;
			}
		} else {
			continue;
		}

		minX = Math.min(minX, bbox.left);
		minY = Math.min(minY, bbox.top);
		maxX = Math.max(maxX, bbox.right);
		maxY = Math.max(maxY, bbox.bottom);
		hasValidChild = true;
	}

	if (!hasValidChild) {
		return null;
	}

	return { left: minX, top: minY, right: maxX, bottom: maxY };
}
