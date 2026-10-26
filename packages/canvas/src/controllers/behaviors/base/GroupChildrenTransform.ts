import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { ObjectBehaviorRegistry } from "../../gestures/registry/ObjectBehaviorRegistry";

/**
 * Recursively transforms a group's children.
 * Calls each shape's transformByGroup via the registry.
 *
 * @param rootGroupStart - Root group state before the transform
 * @param rootGroupEnd - Root group state after the transform
 * @param targetGroup - The group to transform (root or a nested group)
 * @param allObjects - State of all objects
 * @param objectBehavior - The canvas's object behavior registry (per-shape transformByGroup)
 * @returns The transformed objects
 */
export function transformChildren(
	rootGroupStart: GroupState,
	rootGroupEnd: GroupState,
	targetGroup: GroupState,
	allObjects: Record<string, ObjectState>,
	objectBehavior: ObjectBehaviorRegistry,
): Record<string, ObjectState> {
	const transformed = {} as Record<string, ObjectState>;

	for (const childId of targetGroup.childIds) {
		const child = allObjects[childId];
		if (!child) {
			continue;
		}

		// Get the per-shape transform function via the registry
		const transformByGroupFn = objectBehavior.getTransformByGroup(child.type);

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
				objectBehavior,
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
 * @param objectBehavior - The canvas's object behavior registry (per-shape rotateByGroup)
 * @returns The rotated objects
 */
export function rotateChildren(
	rotationRootGroup: GroupState,
	endGroupRotation: number,
	targetGroup: GroupState,
	allObjects: Record<string, ObjectState>,
	objectBehavior: ObjectBehaviorRegistry,
): Record<string, ObjectState> {
	const rotated = {} as Record<string, ObjectState>;

	for (const childId of targetGroup.childIds) {
		const child = allObjects[childId];
		if (!child) {
			continue;
		}

		// Get the per-shape rotate function via the registry
		const rotateByGroupFn = objectBehavior.getRotateByGroup(child.type);

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
				objectBehavior,
			);
			Object.assign(rotated, nestedRotated);
		}
	}

	return rotated;
}
