import type { Point } from "@workspace/geometry";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
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
 * Groups have geometry: "none" and no position (cx, cy), so this returns the state unchanged.
 * When dragging a group, only its descendants are moved (handled by updateDescendantsRecursively).
 */
export const moveByDelta: MoveByDeltaFunction<GroupState> = (state, _delta) => {
	return state;
};

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
 * Moves a group and all its descendants (including nested groups) by delta.
 * Updates both the group's cached frame and all child objects recursively.
 *
 * @param groupId - ID of the group to move
 * @param originalObjects - Original objects from eventStartState
 * @param updatedObjects - Target objects to write updates to (mutated)
 * @param delta - Movement delta {x, y}
 */
export function moveGroup(
	groupId: string,
	originalObjects: Record<string, ObjectState>,
	updatedObjects: Record<string, ObjectState>,
	delta: Point,
): void {
	const group = originalObjects[groupId];
	if (!group || group.type !== "group") {
		return;
	}

	const groupState = group as GroupState;

	// Move group's cached frame (simple translation)
	updatedObjects[groupId] = {
		...groupState,
		cx: groupState.cx + delta.x,
		cy: groupState.cy + delta.y,
	} as GroupState;

	// Move all children recursively
	for (const childId of groupState.childIds) {
		const child = originalObjects[childId];
		if (!child) {
			continue;
		}

		if (child.type === "group") {
			// Recursively move nested group
			moveGroup(childId, originalObjects, updatedObjects, delta);
		} else {
			// Move regular object using type-specific moveByDelta
			const moveByDeltaFn = objectBehaviorRegistry.getMoveByDelta(child.type);
			if (moveByDeltaFn) {
				updatedObjects[childId] = moveByDeltaFn(child, delta);
			}
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
