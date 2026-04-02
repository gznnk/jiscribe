import type { CanvasState } from "../../../../states/canvas/CanvasState";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/GroupState";
import { updateGroupBounds } from "../../../ui/utils/updateGroupBounds";

/**
 * グループのクリーンアップを行う
 *
 * - グループ内の図形が0個 → グループを削除
 * - グループ内の図形が1個 → グループ化を解除し、図形を親グループ（またはルート）に移動
 * - グループ内の図形が2個以上 → グループを維持
 *
 * @param state - 現在のキャンバス状態
 * @returns クリーンアップ後のキャンバス状態
 */
export const cleanupGroups = (state: CanvasState): CanvasState => {
	const updatedObjects = { ...state.objects };
	const updatedRootIds = [...state.rootIds];
	const groupsToProcess = new Set<string>();

	// すべてのグループをクリーンアップ対象として収集
	for (const [id, obj] of Object.entries(updatedObjects)) {
		if (obj?.type === "group") {
			groupsToProcess.add(id);
		}
	}

	// 何も変更がなくなるまで繰り返す（ネストしたグループの場合に備えて）
	let hasChanges = true;
	while (hasChanges) {
		hasChanges = false;

		for (const groupId of Array.from(groupsToProcess)) {
			const group = updatedObjects[groupId] as GroupState | undefined;
			if (!group || group.type !== "group") {
				groupsToProcess.delete(groupId);
				continue;
			}

			const childCount = group.childIds.length;

			if (childCount === 0) {
				// グループ内が空 → グループを削除
				hasChanges = true;
				groupsToProcess.delete(groupId);

				if (group.parentId != null) {
					// 親グループから除去
					const parent = updatedObjects[group.parentId];
					if (parent?.type === "group") {
						const parentGroup = parent as GroupState;
						updatedObjects[group.parentId] = {
							...parentGroup,
							childIds: parentGroup.childIds.filter(
								(cid: string) => cid !== groupId,
							),
						} as GroupState;

						// 除去後の親の bounds を更新
						const updatedParent = updateGroupBounds(
							updatedObjects,
							group.parentId,
						);
						if (updatedParent) {
							updatedObjects[group.parentId] = updatedParent;
						}

						// 親も再チェック対象に
						groupsToProcess.add(group.parentId);
					}
				} else {
					// ルートから除去
					const index = updatedRootIds.indexOf(groupId);
					if (index !== -1) {
						updatedRootIds.splice(index, 1);
					}
				}

				// オブジェクトを削除
				delete updatedObjects[groupId];
			} else if (childCount === 1) {
				// グループ内が1個 → グループ化を解除
				hasChanges = true;
				groupsToProcess.delete(groupId);

				const childId = group.childIds[0];
				const child = updatedObjects[childId];
				if (!child) continue;

				if (group.parentId != null) {
					// 親グループに子を移動
					const parent = updatedObjects[group.parentId];
					if (parent?.type === "group") {
						const parentGroup = parent as GroupState;
						updatedObjects[group.parentId] = {
							...parentGroup,
							childIds: parentGroup.childIds.map((cid: string) =>
								cid === groupId ? childId : cid,
							),
						} as GroupState;

						// 移動後の親の bounds を更新
						const updatedParent = updateGroupBounds(
							updatedObjects,
							group.parentId,
						);
						if (updatedParent) {
							updatedObjects[group.parentId] = updatedParent;
						}

						// 親も再チェック対象に
						groupsToProcess.add(group.parentId);
					}

					// 子の親を更新
					updatedObjects[childId] = {
						...child,
						parentId: group.parentId,
					} as ObjectState;
				} else {
					// ルートに子を移動
					const index = updatedRootIds.indexOf(groupId);
					if (index !== -1) {
						updatedRootIds[index] = childId;
					}

					// 子の親を解除
					updatedObjects[childId] = {
						...child,
						parentId: undefined,
					} as ObjectState;
				}

				// グループを削除
				delete updatedObjects[groupId];
			} else {
				// 2個以上 → クリーンアップ完了
				groupsToProcess.delete(groupId);
			}
		}
	}

	return {
		...state,
		objects: updatedObjects,
		rootIds: updatedRootIds,
	};
};
