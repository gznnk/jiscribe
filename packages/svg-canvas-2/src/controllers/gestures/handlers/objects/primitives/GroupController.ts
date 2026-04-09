import type { Point } from "@workspace/geometry";

import { objectRegistry } from "../../../../../registry/ObjectRegistry";
import type {
	MoveByDeltaFunction,
	TransformByGroupFunction,
} from "../../../../../registry/ObjectRegistryTypes";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import { transformGroupByGroup } from "../base/GroupTransform";

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
		if (!child) continue;

		if (child.type === "group") {
			// Recursively move nested group
			moveGroup(childId, originalObjects, updatedObjects, delta);
		} else {
			// Move regular object using type-specific moveByDelta
			const moveByDeltaFn = objectRegistry.getMoveByDelta(child.type);
			if (moveByDeltaFn) {
				updatedObjects[childId] = moveByDeltaFn(child, delta);
			}
		}
	}
}

/**
 * グループの子要素を再帰的に変形する
 * registry経由で各形状のtransformByGroupを呼び出す
 *
 * @param rootGroupStart - 変形前のルートグループ状態
 * @param rootGroupEnd - 変形後のルートグループ状態
 * @param targetGroup - 変形対象のグループ（ルートまたはネストされたグループ）
 * @param allObjects - 全オブジェクトの状態
 * @returns 変形後のオブジェクト群
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
		if (!child) continue;

		// registry経由で形状ごとのtransform関数を取得
		const transformByGroupFn = objectRegistry.getTransformByGroup(child.type);

		if (transformByGroupFn) {
			transformed[childId] = transformByGroupFn(child, rootGroupStart, rootGroupEnd);
		}

		// 子がGroupの場合は再帰的に子の子も変形
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
