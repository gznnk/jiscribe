import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { calculateGroupOrientedBounds } from "../../../states/utils/calculateGroupOrientedBounds";
import type { CanvasControllerState } from "../../CanvasTypes";
import { cleanupGroups } from "../../utils/cleanupGroups";
import { findLowestCommonAncestor } from "../../utils/findLowestCommonAncestor";
import { sortObjectIdsByZOrder } from "../../utils/sortObjectIdsByZOrder";
import { updateGroupBoundsFromRoot } from "../../utils/updateGroupBoundsFromRoot";
import type { Command } from "../CommandTypes";

export const GroupCommand: Command = {
	id: "group",
	label: "Group",
	category: "arrange",
	shortcuts: {
		mac: [{ code: "KeyG", meta: true }],
		win: [{ code: "KeyG", ctrl: true }],
		default: [{ code: "KeyG", ctrl: true }],
	},

	canExecute: (state) => state.selectedIds.length >= 2,

	execute: (state) => {
		const groupId = crypto.randomUUID();
		const { selectedIds } = state;
		const selectedSet = new Set(selectedIds);
		const lockAspectRatio = state.multiSelectGroup?.lockAspectRatio ?? false;

		// 新グループをどのグループの直下に配置するかを LCA（最近共通祖先）で決める。
		// 例: group-A 配下の rect-1 と rect-2 を選択した場合、LCA は group-A になり、
		// 新グループは group-A の子として挿入される。
		// 選択アイテムが共通の祖先グループを持たない場合は undefined（ルートに配置）。
		const lcaId = findLowestCommonAncestor(selectedIds, state.objects);

		// グループ化後も図形の重なり順が変わらないよう、selectedIds を z-order で並び替える
		const childIds = sortObjectIdsByZOrder(
			selectedIds,
			state.objects,
			state.rootIds,
		);

		// 新グループのバウンドを計算するため、仮のグループオブジェクトを作成して
		// calculateGroupOrientedBounds に渡す（この時点では cx/cy/width/height は仮の 0）
		const tempGroup = {
			id: groupId,
			type: "group",
			parentId: lcaId,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			childIds,
			cx: 0,
			cy: 0,
			width: 0,
			height: 0,
			lockAspectRatio,
		} as unknown as GroupState;

		const bounds = calculateGroupOrientedBounds(
			{ ...state.objects, [groupId]: tempGroup },
			groupId,
		);

		// 計算したバウンドを反映した確定版グループを作成する
		const newGroup = {
			...tempGroup,
			cx: bounds?.cx ?? 0,
			cy: bounds?.cy ?? 0,
			width: bounds?.width ?? 0,
			height: bounds?.height ?? 0,
		} as unknown as GroupState;

		// objects に新グループを追加し、各子アイテムの parentId を新グループに付け替える
		const updatedObjects = { ...state.objects, [groupId]: newGroup };
		for (const childId of childIds) {
			updatedObjects[childId] = {
				...updatedObjects[childId],
				parentId: groupId,
			};
		}

		// 各選択アイテムをそれぞれの元の親グループの childIds から取り除く。
		// 取り除いた親グループのバウンド更新が後で必要になるため affectedParentIds に記録する。
		const affectedParentIds = new Set<string>();
		for (const id of selectedIds) {
			const parentId = state.objects[id]?.parentId;
			if (parentId != null) {
				const parent = updatedObjects[parentId] as GroupState;
				if (parent) {
					updatedObjects[parentId] = {
						...parent,
						childIds: parent.childIds.filter((cid) => cid !== id),
					} as GroupState;
					affectedParentIds.add(parentId);
				}
			}
		}

		let updatedRootIds = state.rootIds;

		if (lcaId != null) {
			// ── LCA が存在する場合: 新グループを LCA の childIds の末尾（最前面）に追加する ──────────────
			const currentLcaChildIds = (updatedObjects[lcaId] as GroupState).childIds;

			updatedObjects[lcaId] = {
				...(updatedObjects[lcaId] as GroupState),
				childIds: [...currentLcaChildIds, groupId],
			} as GroupState;

			// LCA 自体が選択アイテムの影響を受けて rootIds から消えることはないため、
			// rootにいる要素が選択対象に含まれていれば取り除く
			updatedRootIds = state.rootIds.filter((id) => !selectedSet.has(id));
		} else {
			// ── LCA が存在しない場合: 新グループをルートの末尾（最前面）に配置する ──────────────
			updatedObjects[groupId] = {
				...(updatedObjects[groupId] as GroupState),
				parentId: undefined,
			} as GroupState;

			const currentRootIds = state.rootIds.filter((id) => !selectedSet.has(id));
			updatedRootIds = [...currentRootIds, groupId];
		}

		// 選択アイテムを取り出した副作用で空や単体になったグループ（LCA を含む）を整理する。
		// LCA 自体も1件になれば cleanupGroups が解体する（これは正しい挙動）。
		let nextState: CanvasControllerState = {
			...state,
			objects: updatedObjects,
			rootIds: updatedRootIds,
			selectedIds: [groupId],
			objectMenuOpenId: null,
			commitVersion: state.commitVersion + 1,
		};
		for (const parentId of affectedParentIds) {
			nextState = updateGroupBoundsFromRoot(nextState, parentId);
		}
		return cleanupGroups(nextState);
	},
};
