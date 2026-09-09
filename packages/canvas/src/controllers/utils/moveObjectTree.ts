import type { Point } from "@jiscribe/geometry";

import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";
import type { ObjectBehaviorRegistry } from "../gestures/registry/ObjectBehaviorRegistry";

/**
 * Moves an object and, when it is a group, all of its descendants (including nested groups) by delta.
 *
 * Every node is translated uniformly through its registered moveByDelta (no per-shape branching);
 * only the descendant traversal is group-specific, and this is the single place that propagates a
 * move down the containment tree.
 *
 * Reads always come from srcObjects (the pristine source) and writes go to dstObjects, so an
 * absolute delta is never applied twice. srcObjects and dstObjects may be the same map.
 *
 * @param id - ID of the object (or group root) to move
 * @param srcObjects - Source objects to read from (e.g. the drag-start snapshot)
 * @param dstObjects - Target objects to write updates to (mutated)
 * @param delta - Movement delta {x, y}
 * @param objectBehavior - The canvas's object behavior registry (per-shape moveByDelta)
 */
export function moveObjectTree(
	id: string,
	srcObjects: Record<string, ObjectState>,
	dstObjects: Record<string, ObjectState>,
	delta: Point,
	objectBehavior: ObjectBehaviorRegistry,
): void {
	const src = srcObjects[id];
	if (!src) {
		return;
	}

	const moveByDeltaFn = objectBehavior.getMoveByDelta(src.type);
	if (moveByDeltaFn) {
		dstObjects[id] = moveByDeltaFn(src, delta);
	}

	// Propagate to descendants: only groups own a containment subtree.
	if (isGroupState(src)) {
		for (const childId of src.childIds) {
			moveObjectTree(childId, srcObjects, dstObjects, delta, objectBehavior);
		}
	}
}
