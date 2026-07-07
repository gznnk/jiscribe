import type { Point } from "@workspace/geometry";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import {
	isGroupState,
	type GroupState,
} from "../../../../../states/objects/primitives/group/GroupState";
import { objectBehaviorRegistry } from "../../../registry/ObjectBehaviorRegistry";
import type {
	MoveByDeltaFunction,
	RotateByGroupFunction,
	TransformByGroupFunction,
} from "../../../registry/ObjectBehaviorTypes";
import {
	transformGroupByGroup,
	rotateGroupByGroup,
} from "../base/GroupTransform";

/**
 * Moves a Group object by a delta.
 * A GroupState is a Frame with its own center (cx, cy), so translate it like any other shape.
 * Descendants are propagated separately by moveObjectTree (the group is only responsible for
 * its own cached frame here).
 */
export const moveByDelta: MoveByDeltaFunction<GroupState> = (state, delta) => ({
	...state,
	cx: state.cx + delta.x,
	cy: state.cy + delta.y,
});

/**
 * Transforms a Group object when its parent group is transformed.
 */
export const transformByGroup: TransformByGroupFunction<GroupState> = (
	state,
	groupStart,
	groupEnd,
) => {
	return transformGroupByGroup(
		state,
		groupStart as GroupState,
		groupEnd as GroupState,
	);
};

/**
 * Rotates a Group object when its parent group is rotated.
 */
export const rotateByGroup: RotateByGroupFunction<GroupState> = (
	state,
	rotationRootGroup,
	endGroupRotation,
) => {
	return rotateGroupByGroup(
		state,
		rotationRootGroup as GroupState,
		endGroupRotation,
	);
};

/**
 * Moves an object and, when it is a group, all of its descendants (including nested groups) by delta.
 *
 * Every node is translated uniformly through its registered moveByDelta (no per-shape branching);
 * only the descendant traversal is group-specific, and it lives here as the single place that
 * propagates a move down the containment tree.
 *
 * Reads always come from srcObjects (the pristine source) and writes go to dstObjects, so an
 * absolute delta is never applied twice. srcObjects and dstObjects may be the same map.
 *
 * @param id - ID of the object (or group root) to move
 * @param srcObjects - Source objects to read from (e.g. the drag-start snapshot)
 * @param dstObjects - Target objects to write updates to (mutated)
 * @param delta - Movement delta {x, y}
 */
export function moveObjectTree(
	id: string,
	srcObjects: Record<string, ObjectState>,
	dstObjects: Record<string, ObjectState>,
	delta: Point,
): void {
	const src = srcObjects[id];
	if (!src) {
		return;
	}

	const moveByDeltaFn = objectBehaviorRegistry.getMoveByDelta(src.type);
	if (moveByDeltaFn) {
		dstObjects[id] = moveByDeltaFn(src, delta);
	}

	// Propagate to descendants: only groups own a containment subtree.
	if (isGroupState(src)) {
		for (const childId of src.childIds) {
			moveObjectTree(childId, srcObjects, dstObjects, delta);
		}
	}
}

/**
 * Recursively transforms a group's children.
 * Calls each shape's transformByGroup via the registry.
 *
 * @param rootGroupStart - Root group state before the transform
 * @param rootGroupEnd - Root group state after the transform
 * @param targetGroup - The group to transform (root or a nested group)
 * @param allObjects - State of all objects
 * @returns The transformed objects
 */
export function transformChildren(
	rootGroupStart: GroupState,
	rootGroupEnd: GroupState,
	targetGroup: GroupState,
	allObjects: Record<string, ObjectState>,
): Record<string, ObjectState> {
	const transformed = {} as Record<string, ObjectState>;

	for (const childId of targetGroup.childIds) {
		const child = allObjects[childId];
		if (!child) {
			continue;
		}

		// Get the per-shape transform function via the registry
		const transformByGroupFn = objectBehaviorRegistry.getTransformByGroup(
			child.type,
		);

		if (transformByGroupFn) {
			transformed[childId] = transformByGroupFn(
				child,
				rootGroupStart,
				rootGroupEnd,
			);
		}

		// If the child is a Group, recursively transform its children too
		if (child.type === "group") {
			const nestedTransformed = transformChildren(
				rootGroupStart,
				rootGroupEnd,
				child as GroupState,
				allObjects,
			);
			Object.assign(transformed, nestedTransformed);
		}
	}

	return transformed;
}

/**
 * Recursively rotates a group's children.
 * Calls each shape's rotateByGroup via the registry.
 *
 * @param rotationRootGroup - The group state used as the rotation reference
 * @param endGroupRotation - The group's rotation angle at the end
 * @param targetGroup - The group to rotate (root or a nested group)
 * @param allObjects - State of all objects
 * @returns The rotated objects
 */
export function rotateChildren(
	rotationRootGroup: GroupState,
	endGroupRotation: number,
	targetGroup: GroupState,
	allObjects: Record<string, ObjectState>,
): Record<string, ObjectState> {
	const rotated = {} as Record<string, ObjectState>;

	for (const childId of targetGroup.childIds) {
		const child = allObjects[childId];
		if (!child) {
			continue;
		}

		// Get the per-shape rotate function via the registry
		const rotateByGroupFn = objectBehaviorRegistry.getRotateByGroup(child.type);

		if (rotateByGroupFn) {
			rotated[childId] = rotateByGroupFn(
				child,
				rotationRootGroup,
				endGroupRotation,
			);
		}

		// If the child is a Group, recursively rotate its children too
		if (child.type === "group") {
			const nestedRotated = rotateChildren(
				rotationRootGroup,
				endGroupRotation,
				child as GroupState,
				allObjects,
			);
			Object.assign(rotated, nestedRotated);
		}
	}

	return rotated;
}
