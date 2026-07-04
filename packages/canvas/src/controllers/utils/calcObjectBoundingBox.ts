import {
	calcBoundingBox,
	calcPolyBoundingBox,
	isTransformedFrame,
} from "@workspace/geometry";
import type { BoundingBox } from "@workspace/geometry";

import { calcConnectorBoundingBox } from "./calcConnectorBoundingBox";
import { isPoly } from "../../schemas/objects/types/Poly";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isConnectorState } from "../../states/objects/connections/connector/ConnectorState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * Computes the axis-aligned bounding box of a single object, dispatching on
 * its kind. This is the single source of truth for bbox composition — do not
 * re-implement the connector/group/frame/poly branching at call sites.
 *
 * Dispatch order is load-bearing:
 * - Connectors pass isPoly (points = intermediate waypoints only), so they
 *   must be resolved via calcConnectorBoundingBox before the isPoly branch.
 * - Groups pass isTransformedFrame (GroupState includes Frame), so recursion
 *   over children must come before the frame branch.
 *
 * @param obj - The object whose bounding box is computed
 * @param objects - The object map, used to resolve connector endpoints and group children
 * @returns The bounding box, or null when the object has no valid extent
 *   (unresolvable connector, group without valid children, empty poly, unknown kind)
 */
export function calcObjectBoundingBox(
	obj: ObjectState,
	objects: Record<string, ObjectState>,
): BoundingBox | null {
	if (isConnectorState(obj)) {
		return calcConnectorBoundingBox(obj, objects);
	}

	if (isGroupState(obj)) {
		return calcObjectsBoundingBox(obj.childIds, objects);
	}

	if (isTransformedFrame(obj)) {
		return calcBoundingBox(obj);
	}

	if (isPoly(obj)) {
		return calcPolyBoundingBox(obj.points);
	}

	return null;
}

/**
 * Computes the union bounding box of the objects with the given IDs.
 *
 * Missing IDs and objects without a valid extent are skipped.
 *
 * @param ids - IDs of the objects to include
 * @param objects - The object map
 * @returns The union bounding box, or null when no object has a valid extent
 */
export function calcObjectsBoundingBox(
	ids: Iterable<string>,
	objects: Record<string, ObjectState>,
): BoundingBox | null {
	let left = Infinity;
	let top = Infinity;
	let right = -Infinity;
	let bottom = -Infinity;
	let hasValidObject = false;

	for (const id of ids) {
		const obj = objects[id];
		if (!obj) {
			continue;
		}

		const bbox = calcObjectBoundingBox(obj, objects);
		if (!bbox) {
			continue;
		}

		left = Math.min(left, bbox.left);
		top = Math.min(top, bbox.top);
		right = Math.max(right, bbox.right);
		bottom = Math.max(bottom, bbox.bottom);
		hasValidObject = true;
	}

	if (!hasValidObject) {
		return null;
	}

	return { left, top, right, bottom };
}
