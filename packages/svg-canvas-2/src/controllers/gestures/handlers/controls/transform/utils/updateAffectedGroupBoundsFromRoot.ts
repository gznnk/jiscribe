import { updateGroupBounds } from "../../../../../../controllers/ui/utils/updateGroupBounds";
import type { CanvasState } from "../../../../../../states/canvas/CanvasState";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/GroupState";

/**
 * Updates the bounding frames of affected groups by traversing from root to leaves.
 * This is more efficient than separate upward and downward passes.
 *
 * Process:
 * 1. Find the root group by traversing upward from the transformed group
 * 2. Collect all affected group IDs (transformed group + all its ancestors)
 * 3. Traverse from root downward, updating only affected groups
 *
 * @param state - Current canvas state with updated object positions
 * @param transformedGroupId - ID of the group that was transformed
 * @returns Updated canvas state with recalculated group bounds
 */
export function updateAffectedGroupBoundsFromRoot(
	state: CanvasState,
	transformedGroupId: string,
): CanvasState {
	// 1. 変形したグループから親を辿り、影響を受けたグループIDを収集
	const affectedGroupIds = new Set<string>();
	let currentId: string | undefined = transformedGroupId;

	while (currentId) {
		affectedGroupIds.add(currentId);
		const obj: ObjectState | undefined = state.objects[currentId];
		currentId = obj?.parentId;
	}

	// 影響を受けたグループがない場合は何もしない
	if (affectedGroupIds.size === 0) {
		return state;
	}

	// 2. rootグループのIDを取得（親がいないグループ）
	const rootGroupId = findRootGroupId(state.objects, transformedGroupId);
	if (!rootGroupId) {
		return state;
	}

	// 3. rootから子方向へ降りながら、影響を受けたグループのみ更新
	const updatedObjects = { ...state.objects };
	updateGroupsFromRoot(updatedObjects, rootGroupId, affectedGroupIds);

	return {
		...state,
		objects: updatedObjects,
	};
}

/**
 * Finds the root group ID by traversing upward from the given group.
 * Returns the topmost group in the affected chain.
 */
function findRootGroupId(
	objects: Record<string, ObjectState>,
	groupId: string,
): string | undefined {
	let currentId: string | undefined = groupId;
	let rootId: string | undefined = groupId;

	while (currentId) {
		const obj: ObjectState | undefined = objects[currentId];
		if (!obj) break;

		rootId = currentId;
		currentId = obj.parentId;
	}

	return rootId;
}

/**
 * Recursively updates groups from root to leaves (depth-first).
 * Only updates groups that are in the affectedGroupIds set.
 * Processes children first, then updates the parent to ensure correct bottom-up bounds.
 */
function updateGroupsFromRoot(
	objects: Record<string, ObjectState>,
	groupId: string,
	affectedGroupIds: Set<string>,
): void {
	const group = objects[groupId];
	if (!group || group.type !== "group") {
		return;
	}

	const groupState = group as GroupState;

	// まず子グループを再帰的に処理（深さ優先）
	if (groupState.childIds) {
		for (const childId of groupState.childIds) {
			const child = objects[childId];
			if (child && child.type === "group" && affectedGroupIds.has(childId)) {
				updateGroupsFromRoot(objects, childId, affectedGroupIds);
			}
		}
	}

	// 影響を受けたグループの場合のみ境界を更新
	if (affectedGroupIds.has(groupId)) {
		const updatedGroup = updateGroupBounds(objects, groupId);
		if (updatedGroup) {
			objects[groupId] = updatedGroup;
		}
	}
}
